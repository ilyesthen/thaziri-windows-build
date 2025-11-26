/**
 * Medicine Data Import Script
 * 
 * This script imports:
 * 1. Medicines from 21.xml into medicines table
 * 2. Quantities from 22.xml into quantities table  
 * 3. Ordonnances from Export 2.xml into ordonnances table
 * Then counts actual medicine usage from ordonnances
 * 
 * Usage: npm run db:import-medicines
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parseString, ParserOptions } from 'xml2js'
import { promisify } from 'util'

const parseXML = promisify<string, ParserOptions, any>(parseString)
const prisma = new PrismaClient()

/**
 * XML structure for medicines from 21.xml
 */
interface XMLMedicineContenu {
  'N__Enr.'?: string[]
  'IDPREPA'?: string[]
  'CODELIB'?: string[]
  'LIBPREP'?: string[]
  'NBPRES'?: string[]
  'NATURE'?: string[]
}

interface XMLMedicineRoot {
  WINDEV_TABLE: {
    Table_Contenu: XMLMedicineContenu[]
  }
}

/**
 * XML structure for ordonnances from Export 2.xml
 */
interface XMLOrdonnanceContenu {
  'N__Enr.'?: string[]
  'DATEORD'?: string[]
  'CDEP'?: string[]
  'AG2'?: string[]
  'SEQ'?: string[]
  'STRAIT'?: string[]
  'MEDCIN'?: string[]
  'SEQPAT'?: string[]
  'SMONT'?: string[]
  'ACTEX'?: string[]
  'strait1'?: string[]
  'strait2'?: string[]
  'strait3'?: string[]
  'ACTEX1'?: string[]
  'ACTEX2'?: string[]
}

interface XMLOrdonnanceRoot {
  WINDEV_TABLE: {
    Table_Contenu: XMLOrdonnanceContenu[]
  }
}

/**
 * Parsed medicine data
 */
interface ParsedMedicine {
  id: number
  code: string
  libprep: string
  nbpres: number
  nature: string
  actualUsageCount?: number
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
 * Extract LIBPREP with preserved formatting (spaces and newlines)
 * Converts &#13; to actual newlines and preserves spacing
 */
function extractLibprep(value: string[] | undefined): string | undefined {
  if (!value || value.length === 0) return undefined
  const str = value[0]
  if (!str) return undefined
  
  // Replace XML entities with actual newlines, preserve all spacing
  const formatted = str
    .replace(/&#13;/g, '\n')  // Convert &#13; to newline
    .replace(/&#10;/g, '\n')  // Convert &#10; to newline (if present)
    .replace(/&amp;/g, '&')   // Convert &amp; to &
    .replace(/&lt;/g, '<')    // Convert &lt; to <
    .replace(/&gt;/g, '>')    // Convert &gt; to >
  
  return formatted || undefined
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
 * Transform medicine XML data
 */
function transformMedicine(xmlMedicine: XMLMedicineContenu): ParsedMedicine | null {
  try {
    const id = extractInt(xmlMedicine.IDPREPA)
    const code = extractString(xmlMedicine.CODELIB)
    const libprep = extractLibprep(xmlMedicine.LIBPREP) // Use extractLibprep to preserve formatting
    const nbpres = extractInt(xmlMedicine.NBPRES) || 0
    const nature = extractString(xmlMedicine.NATURE) || 'O'
    
    if (!id || !code || !libprep) {
      return null
    }
    
    return {
      id,
      code,
      libprep, // Keep the exact formatting with spaces and newlines
      nbpres,
      nature,
      actualUsageCount: 0
    }
  } catch (error) {
    console.error('❌ Error transforming medicine record:', error)
    return null
  }
}

/**
 * Count medicine usage from ordonnances
 */
async function countMedicineUsage(medicines: ParsedMedicine[]): Promise<Map<string, number>> {
  const usageCount = new Map<string, number>()
  
  try {
    console.log('\n📊 Counting medicine usage from ordonnances...')
    
    // Read Export 2.xml
    const veryXmlPath = path.join(__dirname, '..', 'Export 2.xml')
    
    if (!fs.existsSync(veryXmlPath)) {
      console.log('⚠️  Export 2.xml not found, using default counts from 21.xml')
      return usageCount
    }
    
    console.log(`📁 Reading Export 2.xml...`)
    const xmlContent = fs.readFileSync(veryXmlPath, 'utf-8')
    console.log(`✅ Export 2.xml loaded (${(xmlContent.length / 1024 / 1024).toFixed(2)} MB)`)
    
    // Parse XML
    const parsedXML = await parseXML(xmlContent, {
      explicitArray: true,
      trim: false,  // Preserve formatting
      normalize: false,  // Preserve formatting
      preserveChildrenOrder: true
    }) as XMLOrdonnanceRoot
    
    const ordonnancesArray = parsedXML?.WINDEV_TABLE?.Table_Contenu || []
    console.log(`📋 Found ${ordonnancesArray.length.toLocaleString()} ordonnance(s)`)
    
    // Count medicine occurrences in ordonnances
    for (const ordonnance of ordonnancesArray) {
      const strait = extractString(ordonnance.STRAIT) || ''
      const strait1 = extractString(ordonnance.strait1) || ''
      const strait2 = extractString(ordonnance.strait2) || ''
      const strait3 = extractString(ordonnance.strait3) || ''
      
      const fullContent = `${strait} ${strait1} ${strait2} ${strait3}`.toUpperCase()
      
      // Look for each medicine in the ordonnance content
      for (const medicine of medicines) {
        const medicineCode = medicine.code.toUpperCase()
        
        // Check if medicine name appears in ordonnance
        if (fullContent.includes(medicineCode)) {
          const currentCount = usageCount.get(medicine.code) || 0
          usageCount.set(medicine.code, currentCount + 1)
        }
      }
    }
    
    console.log(`✅ Counted usage for ${usageCount.size} medicine(s)`)
    
  } catch (error) {
    console.error('⚠️  Error counting medicine usage:', error)
  }
  
  return usageCount
}

/**
 * Main import function
 */
async function importMedicines() {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Starting medicine data import...\n')

    // Read 21.xml file
    const xmlPath = path.join(__dirname, '..', '21.xml')
    
    if (!fs.existsSync(xmlPath)) {
      console.error(`❌ Error: 21.xml file not found at ${xmlPath}`)
      console.log('\n💡 Please ensure 21.xml is in the project root directory.')
      process.exit(1)
    }

    console.log(`📁 Reading XML file: ${xmlPath}`)
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8')
    console.log(`✅ XML file loaded (${(xmlContent.length / 1024 / 1024).toFixed(2)} MB)`)

    // Parse XML
    console.log('\n⚙️  Parsing XML data...')
    const parsedXML = await parseXML(xmlContent, {
      explicitArray: true,
      trim: false,  // DON'T trim - we need to preserve spacing
      normalize: false,  // DON'T normalize - we need original formatting
      preserveChildrenOrder: true
    }) as XMLMedicineRoot
    console.log('✅ XML parsed successfully')

    // Extract medicine records
    const medicinesArray = parsedXML?.WINDEV_TABLE?.Table_Contenu || []
    
    if (!medicinesArray || medicinesArray.length === 0) {
      console.log('\n⚠️  No medicine records found in XML file')
      process.exit(0)
    }

    console.log(`\n📊 Found ${medicinesArray.length.toLocaleString()} medicine record(s) in XML`)

    // Transform XML data to database format
    console.log('\n⚙️  Transforming medicine data...')
    const transformedMedicines: ParsedMedicine[] = []
    const seenCodes = new Set<string>()
    let skippedCount = 0
    let duplicateCount = 0
    
    for (const xmlMedicine of medicinesArray) {
      const medicine = transformMedicine(xmlMedicine)
      if (medicine) {
        // Check for duplicate codes
        if (seenCodes.has(medicine.code)) {
          console.log(`   ⚠️  Skipping duplicate medicine code: ${medicine.code}`)
          duplicateCount++
          continue
        }
        seenCodes.add(medicine.code)
        transformedMedicines.push(medicine)
      } else {
        skippedCount++
      }
    }
    
    console.log(`✅ Successfully transformed ${transformedMedicines.length.toLocaleString()} medicine record(s)`)
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} invalid record(s)`)
    }
    if (duplicateCount > 0) {
      console.log(`⚠️  Skipped ${duplicateCount} duplicate medicine code(s)`)
    }

    // Count actual usage from Export 2.xml
    const usageCount = await countMedicineUsage(transformedMedicines)
    
    // Update medicines with actual usage counts
    for (const medicine of transformedMedicines) {
      const actualCount = usageCount.get(medicine.code) || 0
      medicine.actualUsageCount = actualCount
      
      // Log medicines with high usage
      if (actualCount > 100) {
        console.log(`   💊 ${medicine.code}: ${actualCount} prescriptions`)
      }
    }

    // Sort medicines by actual usage count
    transformedMedicines.sort((a, b) => (b.actualUsageCount || 0) - (a.actualUsageCount || 0))
    
    // Import medicines into database
    console.log('\n💾 Importing medicines into database...')
    
    // Delete existing medicines
    await prisma.medicine.deleteMany()
    
    // Import medicines in batches
    const BATCH_SIZE = 100
    const totalBatches = Math.ceil(transformedMedicines.length / BATCH_SIZE)
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, transformedMedicines.length)
      const batch = transformedMedicines.slice(start, end)
      
      await prisma.medicine.createMany({
        data: batch.map(m => ({
          id: m.id,
          code: m.code,
          libprep: m.libprep,
          nbpres: m.nbpres,
          nature: m.nature,
          actualCount: m.actualUsageCount || 0
        }))
      })
      
      const progress = ((i + 1) / totalBatches * 100).toFixed(1)
      process.stdout.write(`\r   Medicines: ${progress}% (${Math.min(end, transformedMedicines.length)} / ${transformedMedicines.length})`)
    }
    
    console.log('')
    
    // Import quantities from 22.xml
    await importQuantities()
    
    // Import ordonnances from Export 2.xml
    await importOrdonnances()
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n✨ Import completed successfully!`)
    console.log(`⏱️  Total time: ${duration}s\n`)

  } catch (error) {
    console.error('\n❌ Import failed with error:')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Import quantities from 22.xml
 */
async function importQuantities() {
  try {
    console.log('\n📦 Importing quantities from 22.xml...')
    
    const xmlPath = path.join(__dirname, '..', '22.xml')
    
    if (!fs.existsSync(xmlPath)) {
      console.log('⚠️  22.xml not found, skipping quantities import')
      return
    }
    
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8')
    const parsedXML = await parseXML(xmlContent, {
      explicitArray: true,
      trim: false,  // Preserve formatting
      normalize: false,  // Preserve formatting
      preserveChildrenOrder: true
    })
    
    const quantitiesArray = parsedXML?.WINDEV_TABLE?.Table_Contenu || []
    
    // Delete existing quantities
    await prisma.quantity.deleteMany()
    
    // Transform and import quantities
    const quantities = []
    for (const xmlQty of quantitiesArray) {
      const id = extractInt(xmlQty.IDQTITE)
      const qtite = extractString(xmlQty.QTITE)
      
      if (id && qtite && qtite.trim()) {
        quantities.push({ id, qtite: qtite.trim() })
      }
    }
    
    if (quantities.length > 0) {
      await prisma.quantity.createMany({
        data: quantities
      })
      console.log(`✅ Imported ${quantities.length} quantities`)
    }
    
  } catch (error) {
    console.error('⚠️  Error importing quantities:', error)
  }
}

/**
 * Import ordonnances from Export 2.xml
 */
async function importOrdonnances() {
  try {
    console.log('\n📋 Importing ordonnances from Export 2.xml...')
    
    const xmlPath = path.join(__dirname, '..', 'Export 2.xml')
    
    if (!fs.existsSync(xmlPath)) {
      console.log('⚠️  Export 2.xml not found, skipping ordonnances import')
      return
    }
    
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8')
    console.log(`   File size: ${(xmlContent.length / 1024 / 1024).toFixed(2)} MB`)
    
    const parsedXML = await parseXML(xmlContent, {
      explicitArray: true,
      trim: false,  // Preserve formatting
      normalize: false,  // Preserve formatting
      preserveChildrenOrder: true
    })
    
    const ordonnancesArray = parsedXML?.WINDEV_TABLE?.Table_Contenu || []
    console.log(`   Found ${ordonnancesArray.length.toLocaleString()} ordonnance(s)`)
    
    // Delete existing ordonnances
    await prisma.ordonnance.deleteMany()
    
    // Import ordonnances in batches
    const BATCH_SIZE = 500
    const totalBatches = Math.ceil(ordonnancesArray.length / BATCH_SIZE)
    let totalImported = 0
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE
      const end = Math.min(start + BATCH_SIZE, ordonnancesArray.length)
      const batch = ordonnancesArray.slice(start, end)
      
      const ordonnances = []
      for (const xmlOrd of batch) {
        const patientCode = extractInt(xmlOrd.CDEP)
        if (!patientCode) continue
        
        ordonnances.push({
          dateOrd: extractString(xmlOrd.DATEORD),
          patientCode,
          age: extractInt(xmlOrd.AG2),
          seq: extractInt(xmlOrd.SEQ),
          strait: extractLibprep(xmlOrd.STRAIT), // Preserve formatting
          strait1: extractLibprep(xmlOrd.strait1), // Preserve formatting
          strait2: extractLibprep(xmlOrd.strait2), // Preserve formatting
          strait3: extractLibprep(xmlOrd.strait3), // Preserve formatting
          medecin: extractString(xmlOrd.MEDCIN),
          seqpat: extractString(xmlOrd.SEQPAT),
          actex: extractString(xmlOrd.ACTEX),
          actex1: extractString(xmlOrd.ACTEX1),
          actex2: extractString(xmlOrd.ACTEX2),
          addressedBy: extractString(xmlOrd['ADressé_par']),
          titreCr: extractString(xmlOrd.titre_cr)
        })
      }
      
      if (ordonnances.length > 0) {
        await prisma.ordonnance.createMany({
          data: ordonnances
        })
        totalImported += ordonnances.length
        const progress = ((i + 1) / totalBatches * 100).toFixed(1)
        process.stdout.write(`\r   Ordonnances: ${progress}% (${totalImported.toLocaleString()} / ${ordonnancesArray.length.toLocaleString()})`)
      }
    }
    
    console.log('')
    console.log(`✅ Imported ${totalImported.toLocaleString()} ordonnances`)
    
  } catch (error) {
    console.error('⚠️  Error importing ordonnances:', error)
  }
}

// Run the import
importMedicines()
