/**
 * Ordonnances Data Import Script
 * 
 * Imports ordonnance data from ordononce.xml for:
 * 1. Prescriptions (ordonnances table)
 * 2. Bilan acts (bilan_acts table)
 * 3. Comptes Rendus (comptes_rendus table)
 * 
 * NOTE: Does NOT import medicines or templates - only patient-specific data
 * 
 * Usage: npm run db:import-ordonnances-xml
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

interface XmlOrdonnanceData {
  'N__Enr.'?: string[]
  'CDEP'?: string[]
  'DATEORD'?: string[]
  'AG2'?: string[]
  'SEQ'?: string[]
  'STRAIT'?: string[]
  'strait1'?: string[]
  'strait2'?: string[]
  'strait3'?: string[]
  'MEDCIN'?: string[]
  'ACTEX'?: string[]
  'SEQPAT'?: string[]
}

function getXmlValue(value: string[] | undefined): string | null {
  if (!value || !value[0] || value[0].trim() === '') {
    return null
  }
  return value[0].trim()
}

async function importOrdonnances() {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Starting ordonnances import from ordononce.xml...\n')
    
    const xmlFilePath = path.join(__dirname, '..', 'ordononce.xml')
    
    if (!fs.existsSync(xmlFilePath)) {
      console.error(`❌ ordononce.xml not found at ${xmlFilePath}`)
      process.exit(1)
    }
    
    console.log('📖 Reading ordononce.xml...')
    const xmlData = fs.readFileSync(xmlFilePath, 'utf-8')
    console.log(`✅ XML loaded (${(xmlData.length / 1024 / 1024).toFixed(2)} MB)`)
    
    console.log('⚙️  Parsing XML...')
    const parsedData = await parseStringPromise(xmlData, {
      explicitArray: true,
      trim: true,
    })
    
    const records = parsedData?.WINDEV_TABLE?.Table_Contenu || []
    console.log(`✅ Found ${records.length.toLocaleString()} ordonnance record(s)\n`)
    
    if (records.length === 0) {
      console.log('⚠️  No records to import')
      return
    }
    
    // Delete existing data
    console.log('🗑️  Clearing existing data...')
    await prisma.ordonnance.deleteMany()
    console.log('✅ Cleared ordonnances\n')
    
    console.log('💾 Importing ordonnances...')
    let importedOrdonnances = 0
    let skipped = 0
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i] as XmlOrdonnanceData
      
      try {
        const patientCode = getXmlValue(record.CDEP)
        const dateOrd = getXmlValue(record.DATEORD)
        const actex = getXmlValue(record.ACTEX) || 'ORDONNANCE'
        
        if (!patientCode) {
          skipped++
          continue
        }
        
        // Classify by ACTEX type
        const actexUpper = actex.toUpperCase()
        
        // Import ALL records into ordonnances table
        // The application will filter by actex when needed
        await prisma.ordonnance.create({
          data: {
            dateOrd,
            patientCode: parseInt(patientCode),
            age: record.AG2 ? parseInt(getXmlValue(record.AG2) || '0') : null,
            seq: record.SEQ ? parseInt(getXmlValue(record.SEQ) || '0') : null,
            strait: getXmlValue(record.STRAIT),
            strait1: getXmlValue(record.strait1),
            strait2: getXmlValue(record.strait2),
            strait3: getXmlValue(record.strait3),
            medecin: getXmlValue(record.MEDCIN),
            actex,
            seqpat: record.SEQPAT ? parseInt(getXmlValue(record.SEQPAT) || '0') : null,
          }
        })
        
        importedOrdonnances++
        
        if ((i + 1) % 100 === 0 || i === records.length - 1) {
          const progress = ((i + 1) / records.length * 100).toFixed(1)
          process.stdout.write(`\r   Progress: ${progress}% (${importedOrdonnances.toLocaleString()} imported, ${skipped} skipped)`)
        }
      } catch (error) {
        console.error(`\n❌ Error importing ordonnance ${i + 1}:`, error)
        skipped++
      }
    }
    
    console.log('\n')
    
    // Count by type
    console.log('📊 Analyzing imported data...')
    const prescriptions = await prisma.ordonnance.count({
      where: { actex: { contains: 'ORDONNANCE' } }
    })
    
    const bilan = await prisma.ordonnance.count({
      where: { 
        OR: [
          { actex: { contains: 'BILAN' } },
          { actex: { contains: 'CERTIFICAT' } },
        ]
      }
    })
    
    const comptesRendus = await prisma.ordonnance.count({
      where: { actex: { contains: 'COMPTE RENDU' } }
    })
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n✅ Import complete!`)
    console.log(`   - Total imported: ${importedOrdonnances.toLocaleString()}`)
    console.log(`   - Skipped: ${skipped}`)
    console.log(`\n📋 Breakdown by type:`)
    console.log(`   - 📝 Prescriptions: ${prescriptions.toLocaleString()}`)
    console.log(`   - 🧪 Bilan acts: ${bilan.toLocaleString()}`)
    console.log(`   - 📄 Comptes Rendus: ${comptesRendus.toLocaleString()}`)
    console.log(`   - ⏱️  Duration: ${duration}s\n`)
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

importOrdonnances()
