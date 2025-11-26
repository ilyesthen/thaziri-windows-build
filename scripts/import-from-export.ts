/**
 * Complete Data Import Script from Export.xml
 * 
 * This script reads patient data AND visit examination data from Export.xml
 * and imports it into the SQLite database with correct field mapping.
 * 
 * Usage: npm run db:import-export
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parseString, ParserOptions } from 'xml2js'
import { promisify } from 'util'

const parseXML = promisify<string, ParserOptions, any>(parseString)
const prisma = new PrismaClient()

/**
 * XML structure from Export.xml - Complete fields
 */
interface XMLVisitExamination {
  // Visit metadata
  'N__Enr.'?: string[]
  'CDEP'?: string[]
  'DATECLI'?: string[]
  'MEDCIN'?: string[]
  'Ag2'?: string[]
  'MOTIF'?: string[]
  
  // Right Eye (OD) - Refraction
  'SCOD'?: string[]
  'AVOD'?: string[]
  'p1'?: string[]      // Sphere OD
  'p2'?: string[]      // Cylinder OD
  'AXD'?: string[]     // Axis OD
  'vpppD'?: string[]   // VL OD (auto-generated)
  'p4'?: string[]      // Alternative VL sphere OD
  
  // Right Eye (OD) - Keratometry & Biometry
  'K1_D'?: string[]
  'K2_D'?: string[]
  'R1_d'?: string[]
  'R2_d'?: string[]
  'RAYOND'?: string[]  // R0 OD
  'pachy1_D'?: string[]  // PACHY OD
  'pachy2_d'?: string[]  // T.O.C OD
  
  // Right Eye (OD) - Examination
  'TOOD'?: string[]      // T.O OD
  'VAD'?: string[]       // GONIO OD
  'LAF'?: string[]       // L.A.F OD
  'FO'?: string[]        // F.O OD
  'comentaire_D'?: string[]  // Notes OD
  
  // Left Eye (OG) - Refraction
  'SCOG'?: string[]
  'AVOG'?: string[]
  'p3'?: string[]      // Sphere OG
  'p5'?: string[]      // Cylinder OG
  'AXG'?: string[]     // Axis OG
  'p7'?: string[]      // VL OG (auto-generated)
  'p6'?: string[]      // Alternative VL sphere OG
  
  // Left Eye (OG) - Keratometry & Biometry
  'K1_G'?: string[]
  'K2_G'?: string[]
  'R1_G'?: string[]
  'R2_G'?: string[]
  'RAYONG'?: string[]  // R0 OG
  'pachy1_g'?: string[]  // PACHY OG
  'pachy2_g'?: string[]  // T.O.C OG
  
  // Left Eye (OG) - Examination
  'TOOG'?: string[]      // T.O OG
  'VAG'?: string[]       // GONIO OG
  'LAF_G'?: string[]     // L.A.F OG
  'FO_G'?: string[]      // F.O OG
  'commentaire_G'?: string[]  // Notes OG
  
  // Additional Fields
  'EP'?: string[]           // D.I.P
  'cycloplégie'?: string[]  // Cycloplégie
  'CAT'?: string[]          // Conduite à tenir
  'DIAG'?: string[]         // Diagnosis (primary)
  'DIIAG'?: string[]        // Diagnosis (alternative)
  'ANG'?: string[]          // General diagnosis (NOT gonioscopy)
}

interface XMLRoot {
  WINDEV_TABLE: {
    Table_Contenu: XMLVisitExamination[]
  }
}

/**
 * Safely extract string value from XML array
 */
function extractString(value: string[] | undefined): string | undefined {
  if (!value || value.length === 0) return undefined
  const str = value[0]?.trim()
  return str && str !== '' ? str : undefined
}

/**
 * Safely extract integer value from XML array
 */
function extractInt(value: string[] | undefined): number | undefined {
  const str = extractString(value)
  if (!str) return undefined
  const num = parseInt(str, 10)
  return isNaN(num) ? undefined : num
}

/**
 * Transforms XML visit examination data into database-compatible format
 */
function transformVisitExamination(xmlRecord: XMLVisitExamination): any | null {
  try {
    const patientCode = extractInt(xmlRecord.CDEP)
    const visitDate = extractString(xmlRecord.DATECLI)
    
    // Skip records without essential data
    if (!patientCode || !visitDate) {
      return null
    }
    
    // Get diagnosis from either DIAG or DIIAG field
    const diagnostic = extractString(xmlRecord.DIAG) || extractString(xmlRecord.DIIAG)
    
    return {
      patientCode,
      visitDate,
      medecin: extractString(xmlRecord.MEDCIN),
      motif: extractString(xmlRecord.MOTIF),
      
      // Right Eye (OD) - Refraction
      svRight: extractString(xmlRecord.SCOD),
      avRight: extractString(xmlRecord.AVOD),
      sphereRight: extractString(xmlRecord.p1),
      cylinderRight: extractString(xmlRecord.p2),
      axisRight: extractString(xmlRecord.AXD),
      vlRight: extractString(xmlRecord.vpppD) || extractString(xmlRecord.p4),
      
      // Right Eye (OD) - Keratometry & Biometry
      k1Right: extractString(xmlRecord.K1_D),
      k2Right: extractString(xmlRecord.K2_D),
      r1Right: extractString(xmlRecord.R1_d),
      r2Right: extractString(xmlRecord.R2_d),
      r0Right: extractString(xmlRecord.RAYOND),
      pachyRight: extractString(xmlRecord.pachy1_D),
      tocRight: extractString(xmlRecord.pachy2_d),
      
      // Right Eye (OD) - Examination
      toRight: extractString(xmlRecord.TOOD),
      gonioRight: extractString(xmlRecord.VAD),
      lafRight: extractString(xmlRecord.LAF),
      foRight: extractString(xmlRecord.FO),
      notesRight: extractString(xmlRecord.comentaire_D),
      
      // Left Eye (OG) - Refraction
      svLeft: extractString(xmlRecord.SCOG),
      avLeft: extractString(xmlRecord.AVOG),
      sphereLeft: extractString(xmlRecord.p3),
      cylinderLeft: extractString(xmlRecord.p5),
      axisLeft: extractString(xmlRecord.AXG),
      vlLeft: extractString(xmlRecord.p7) || extractString(xmlRecord.p6),
      
      // Left Eye (OG) - Keratometry & Biometry
      k1Left: extractString(xmlRecord.K1_G),
      k2Left: extractString(xmlRecord.K2_G),
      r1Left: extractString(xmlRecord.R1_G),
      r2Left: extractString(xmlRecord.R2_G),
      r0Left: extractString(xmlRecord.RAYONG),
      pachyLeft: extractString(xmlRecord.pachy1_g),
      tocLeft: extractString(xmlRecord.pachy2_g),
      
      // Left Eye (OG) - Examination
      toLeft: extractString(xmlRecord.TOOG),
      gonioLeft: extractString(xmlRecord.VAG),
      lafLeft: extractString(xmlRecord.LAF_G),
      foLeft: extractString(xmlRecord.FO_G),
      notesLeft: extractString(xmlRecord.commentaire_G),
      
      // Additional Fields
      dip: extractString(xmlRecord.EP),
      cycloplegie: extractString(xmlRecord.cycloplégie),
      conduiteATenir: extractString(xmlRecord.CAT),
      diagnostic: diagnostic,
    }
  } catch (error) {
    console.error('❌ Error transforming visit examination record:', error)
    return null
  }
}

/**
 * Main import function
 */
async function importFromExport() {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Starting data import from Export.xml...\n')

    // Read XML file
    const xmlPath = path.join(__dirname, '..', 'Export.xml')
    
    if (!fs.existsSync(xmlPath)) {
      console.error(`❌ Error: Export.xml file not found at ${xmlPath}`)
      console.log('\n💡 Please ensure Export.xml is in the project root directory.')
      process.exit(1)
    }

    console.log(`📁 Reading XML file: ${xmlPath}`)
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8')
    console.log(`✅ XML file loaded (${(xmlContent.length / 1024 / 1024).toFixed(2)} MB)`)

    // Parse XML
    console.log('\n⚙️  Parsing XML data...')
    const parsedXML = await parseXML(xmlContent, {
      explicitArray: true,
      trim: true,
      normalize: true,
    }) as XMLRoot
    console.log('✅ XML parsed successfully')

    // Extract records from parsed XML
    const recordsArray = parsedXML?.WINDEV_TABLE?.Table_Contenu || []
    
    if (!recordsArray || recordsArray.length === 0) {
      console.log('\n⚠️  No records found in XML file')
      process.exit(0)
    }

    console.log(`\n📊 Found ${recordsArray.length.toLocaleString()} record(s) in XML`)

    // Clear existing visit examination data
    console.log('\n🗑️  Clearing existing visit examination data...')
    await prisma.visitExamination.deleteMany({})
    console.log('✅ Existing data cleared')

    // Transform XML data to database format
    console.log('\n⚙️  Transforming visit examination data...')
    const transformedRecords: any[] = []
    let skippedCount = 0
    
    for (const xmlRecord of recordsArray) {
      const record = transformVisitExamination(xmlRecord)
      if (record) {
        transformedRecords.push(record)
      } else {
        skippedCount++
      }
    }
    
    console.log(`✅ Successfully transformed ${transformedRecords.length.toLocaleString()} visit examination record(s)`)
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} invalid record(s)`)
    }

    if (transformedRecords.length === 0) {
      console.log('\n⚠️  No valid records to import')
      process.exit(0)
    }

    // Import records in batches
    console.log('\n💾 Importing visit examinations into database...')
    
    const BATCH_SIZE = 500
    const totalBatches = Math.ceil(transformedRecords.length / BATCH_SIZE)
    let totalImported = 0
    
    console.log(`📦 Processing ${totalBatches.toLocaleString()} batch(es) of ${BATCH_SIZE} records each\n`)
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, transformedRecords.length)
      const batch = transformedRecords.slice(start, end)
      
      try {
        const result = await prisma.visitExamination.createMany({
          data: batch,
        })
        
        totalImported += result.count
        const progress = ((i + 1) / totalBatches * 100).toFixed(1)
        process.stdout.write(`\r   Progress: ${progress}% (${totalImported.toLocaleString()} / ${transformedRecords.length.toLocaleString()} records)`)
      } catch (error) {
        console.error(`\n❌ Error importing batch ${i + 1}:`, error)
        throw error
      }
    }
    
    console.log('\n')
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n✨ Successfully imported ${totalImported.toLocaleString()} visit examination record(s)`)
    console.log(`⏱️  Total time: ${duration}s`)
    console.log('✅ Import completed successfully!\n')

  } catch (error) {
    console.error('\n❌ Import failed with error:')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
importFromExport()
