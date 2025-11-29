/**
 * Visit Examinations Import Script
 * 
 * Imports visit examination data from visits.xml
 * 
 * Usage: npm run db:import-visits-xml
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parseStringPromise } from 'xml2js'

const projectRoot = path.join(__dirname, '..')
const databasePath = path.join(projectRoot, 'prisma', 'dev.db')
const databaseUrl = `file:${databasePath}`

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
})

interface XmlVisitData {
  'N__Enr.'?: string[]
  'CDEP'?: string[]
  'DATECLI'?: string[]
  'MEDCIN'?: string[]
  'Ag2'?: string[]
  'MOTIF'?: string[]
  
  // Right Eye (OD)
  'SCOD'?: string[]
  'AVOD'?: string[]
  'p1'?: string[]        // SPHÈRE
  'p2'?: string[]        // CYLINDRE
  'p4'?: string[]        // VL sphere
  'vpppD'?: string[]     // VL (auto)
  'AXD'?: string[]       // AXE
  'K1_D'?: string[]
  'K2_D'?: string[]
  'pachy1_D'?: string[]  // PACHY
  'TOOD'?: string[]      // T.O
  'VAD'?: string[]       // GONIO
  'LAF'?: string[]       // L.A.F
  'FO'?: string[]        // F.O
  'comentaire_D'?: string[]
  
  // Left Eye (OG)
  'SCOG'?: string[]
  'AVOG'?: string[]
  'p3'?: string[]        // SPHÈRE
  'p5'?: string[]        // CYLINDRE
  'p6'?: string[]        // VL sphere
  'p7'?: string[]        // VL (auto)
  'AXG'?: string[]       // AXE
  'K1_G'?: string[]
  'K2_G'?: string[]
  'pachy1_g'?: string[]  // PACHY
  'TOOG'?: string[]      // T.O
  'VAG'?: string[]       // GONIO
  'LAF_G'?: string[]     // L.A.F
  'FO_G'?: string[]      // F.O
  'commentaire_G'?: string[]
  
  // Common
  'EP'?: string[]           // D.I.P
  'cycloplégie'?: string[]
  'CAT'?: string[]          // CONDUITE À TENIR
  'DIAG'?: string[]
  'DIIAG'?: string[]
  'ANG'?: string[]
}

function getXmlValue(value: string[] | undefined): string | null {
  if (!value || !value[0] || value[0].trim() === '' || value[0] === '0') {
    return null
  }
  return value[0].trim()
}

async function importVisits() {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Starting visits import from visits.xml...\n')
    
    const xmlFilePath = path.join(__dirname, '..', 'visits.xml')
    
    if (!fs.existsSync(xmlFilePath)) {
      console.error(`❌ visits.xml not found at ${xmlFilePath}`)
      process.exit(1)
    }
    
    console.log('📖 Reading visits.xml...')
    const xmlData = fs.readFileSync(xmlFilePath, 'utf-8')
    console.log(`✅ XML loaded (${(xmlData.length / 1024 / 1024).toFixed(2)} MB)`)
    
    console.log('⚙️  Parsing XML...')
    const parsedData = await parseStringPromise(xmlData, {
      explicitArray: true,
      trim: true,
    })
    
    const records = parsedData?.WINDEV_TABLE?.Table_Contenu || []
    console.log(`✅ Found ${records.length.toLocaleString()} visit record(s)\n`)
    
    if (records.length === 0) {
      console.log('⚠️  No records to import')
      return
    }
    
    // Delete existing visit examinations
    console.log('🗑️  Clearing existing visit_examinations...')
    await prisma.visitExamination.deleteMany()
    console.log('✅ Cleared\n')
    
    console.log('💾 Importing visits...')
    let imported = 0
    let skipped = 0
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i] as XmlVisitData
      
      try {
        const patientCode = getXmlValue(record.CDEP)
        const visitDate = getXmlValue(record.DATECLI)
        
        if (!patientCode || !visitDate) {
          skipped++
          continue
        }
        
        await prisma.visitExamination.create({
          data: {
            patientCode: parseInt(patientCode),
            visitDate,
            medecin: getXmlValue(record.MEDCIN),
            age: record.Ag2 ? parseInt(getXmlValue(record.Ag2) || '0') : null,
            motif: getXmlValue(record.MOTIF),
            
            // Right Eye
            scod: getXmlValue(record.SCOD),
            avod: getXmlValue(record.AVOD),
            sphereOd: getXmlValue(record.p1),
            cylindreOd: getXmlValue(record.p2),
            axeOd: getXmlValue(record.AXD),
            vlOd: getXmlValue(record.p4) || getXmlValue(record.vpppD),
            k1Od: getXmlValue(record.K1_D),
            k2Od: getXmlValue(record.K2_D),
            pachyOd: getXmlValue(record.pachy1_D),
            toOd: getXmlValue(record.TOOD),
            gonioOd: getXmlValue(record.VAD),
            lafOd: getXmlValue(record.LAF),
            foOd: getXmlValue(record.FO),
            notesOd: getXmlValue(record.comentaire_D),
            
            // Left Eye
            scog: getXmlValue(record.SCOG),
            avog: getXmlValue(record.AVOG),
            sphereOg: getXmlValue(record.p3),
            cylindreOg: getXmlValue(record.p5),
            axeOg: getXmlValue(record.AXG),
            vlOg: getXmlValue(record.p6) || getXmlValue(record.p7),
            k1Og: getXmlValue(record.K1_G),
            k2Og: getXmlValue(record.K2_G),
            pachyOg: getXmlValue(record.pachy1_g),
            toOg: getXmlValue(record.TOOG),
            gonioOg: getXmlValue(record.VAG),
            lafOg: getXmlValue(record.LAF_G),
            foOg: getXmlValue(record.FO_G),
            notesOg: getXmlValue(record.commentaire_G),
            
            // Common
            dip: getXmlValue(record.EP),
            cycloplegie: getXmlValue(record.cycloplégie),
            conduiteATenir: getXmlValue(record.CAT),
            diagnostic: getXmlValue(record.DIAG) || getXmlValue(record.DIIAG) || getXmlValue(record.ANG),
          }
        })
        
        imported++
        
        if ((i + 1) % 100 === 0 || i === records.length - 1) {
          const progress = ((i + 1) / records.length * 100).toFixed(1)
          process.stdout.write(`\r   Progress: ${progress}% (${imported.toLocaleString()} imported, ${skipped} skipped)`)
        }
      } catch (error) {
        console.error(`\n❌ Error importing visit ${i + 1}:`, error)
        skipped++
      }
    }
    
    console.log('\n')
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`✅ Import complete!`)
    console.log(`   - Imported: ${imported.toLocaleString()}`)
    console.log(`   - Skipped: ${skipped}`)
    console.log(`   - Duration: ${duration}s\n`)
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

importVisits()
