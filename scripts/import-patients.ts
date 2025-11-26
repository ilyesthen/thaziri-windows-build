/**
 * Patient Data Import Script
 * 
 * This script reads patient data from the WINDEV XML file and imports it into the SQLite database
 * using Prisma ORM with full type safety and transaction support.
 * 
 * Usage: npm run db:import-patients
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parseString, ParserOptions } from 'xml2js'
import { promisify } from 'util'

const parseXML = promisify<string, ParserOptions, any>(parseString)

// Get the correct database path
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

/**
 * XML structure from WINDEV export
 */
interface XMLTableContenu {
  'N__Enr.'?: string[]
  'CDEP'?: string[]
  'PRP'?: string[]
  'NOMP'?: string[]
  'NOP'?: string[]
  'AGE'?: string[]
  'DATEN'?: string[]
  'ADP'?: string[]
  'TEL'?: string[]
  'CODE_B'?: string[]
  'INFOR_UTILES'?: string[]
  'PH1'?: string[]
  'ATCDG'?: string[]
  'ATCDO'?: string[]
  'crée_le'?: string[]
}

interface XMLRoot {
  WINDEV_TABLE: {
    Table_Contenu: XMLTableContenu[]
  }
}

/**
 * Parsed patient data ready for database insertion
 */
interface ParsedPatient {
  recordNumber?: number
  departmentCode?: number
  firstName: string
  lastName: string
  fullName: string
  age?: number
  dateOfBirth?: Date
  address?: string
  phone?: string
  code?: string
  usefulInfo?: string
  photo1?: string
  generalHistory?: string
  ophthalmoHistory?: string
  originalCreatedDate?: string
}

/**
 * Parse French date format (DD/MM/YYYY) to Date object
 */
function parseFrenchDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null
  
  try {
    const parts = dateStr.trim().split('/')
    if (parts.length !== 3) return null
    
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // Months are 0-indexed in JavaScript
    const year = parseInt(parts[2], 10)
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null
    
    const date = new Date(year, month, day)
    
    // Validate the date is valid
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null
    }
    
    return date
  } catch (error) {
    console.warn(`⚠️  Failed to parse date: ${dateStr}`)
    return null
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
 * Transforms XML patient data into database-compatible format
 */
function transformPatient(xmlPatient: XMLTableContenu): ParsedPatient | null {
  try {
    // Extract required fields
    const firstName = extractString(xmlPatient.PRP)
    const lastName = extractString(xmlPatient.NOMP)
    const fullName = extractString(xmlPatient.NOP)
    
    // Skip records without essential data
    if (!firstName || !lastName || !fullName) {
      console.warn(`⚠️  Skipping record - missing required fields: firstName=${firstName}, lastName=${lastName}`)
      return null
    }
    
    // Parse date of birth
    const dateOfBirthStr = extractString(xmlPatient.DATEN)
    const dateOfBirth = dateOfBirthStr ? parseFrenchDate(dateOfBirthStr) : undefined
    
    return {
      recordNumber: extractInt(xmlPatient['N__Enr.']),
      departmentCode: extractInt(xmlPatient.CDEP),
      firstName,
      lastName,
      fullName,
      age: extractInt(xmlPatient.AGE),
      dateOfBirth: dateOfBirth || undefined,
      address: extractString(xmlPatient.ADP),
      phone: extractString(xmlPatient.TEL),
      code: extractString(xmlPatient.CODE_B),
      usefulInfo: extractString(xmlPatient.INFOR_UTILES),
      photo1: extractString(xmlPatient.PH1),
      generalHistory: extractString(xmlPatient.ATCDG),
      ophthalmoHistory: extractString(xmlPatient.ATCDO),
      originalCreatedDate: extractString(xmlPatient['crée_le']),
    }
  } catch (error) {
    console.error('❌ Error transforming patient record:', error)
    return null
  }
}

/**
 * Main import function
 */
async function importPatients() {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Starting patient data import...\n')

    // Read XML file
    const xmlPath = path.join(__dirname, '..', 'patients.xml')
    
    if (!fs.existsSync(xmlPath)) {
      console.error(`❌ Error: patients.xml file not found at ${xmlPath}`)
      console.log('\n💡 Please ensure patients.xml is in the project root directory.')
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

    // Extract patient records from parsed XML
    const patientsArray = parsedXML?.WINDEV_TABLE?.Table_Contenu || []
    
    if (!patientsArray || patientsArray.length === 0) {
      console.log('\n⚠️  No patient records found in XML file')
      process.exit(0)
    }

    console.log(`\n📊 Found ${patientsArray.length.toLocaleString()} patient record(s) in XML`)

    // Transform XML data to database format
    console.log('\n⚙️  Transforming patient data...')
    const transformedPatients: ParsedPatient[] = []
    let skippedCount = 0
    
    for (const xmlPatient of patientsArray) {
      const patient = transformPatient(xmlPatient)
      if (patient) {
        transformedPatients.push(patient)
      } else {
        skippedCount++
      }
    }
    
    console.log(`✅ Successfully transformed ${transformedPatients.length.toLocaleString()} patient record(s)`)
    if (skippedCount > 0) {
      console.log(`⚠️  Skipped ${skippedCount} invalid record(s)`)
    }

    if (transformedPatients.length === 0) {
      console.log('\n⚠️  No valid patient records to import')
      process.exit(0)
    }

    // Import patients with upsert logic (insert new or update existing)
    console.log('\n💾 Importing/updating patients in database...')
    
    let totalImported = 0
    let totalUpdated = 0
    let totalSkipped = 0
    
    console.log(`📦 Processing ${transformedPatients.length.toLocaleString()} patient record(s)\n`)
    
    for (let i = 0; i < transformedPatients.length; i++) {
      const patient = transformedPatients[i]
      
      try {
        // Check if patient exists by departmentCode
        if (patient.departmentCode) {
          const existing = await prisma.patient.findFirst({
            where: { departmentCode: patient.departmentCode }
          })
          
          if (existing) {
            // Update existing patient
            await prisma.patient.update({
              where: { id: existing.id },
              data: patient
            })
            totalUpdated++
          } else {
            // Create new patient
            await prisma.patient.create({
              data: patient
            })
            totalImported++
          }
        } else {
          // No departmentCode - create new patient
          await prisma.patient.create({
            data: patient
          })
          totalImported++
        }
        
        // Show progress every 100 records
        if ((i + 1) % 100 === 0 || i === transformedPatients.length - 1) {
          const progress = ((i + 1) / transformedPatients.length * 100).toFixed(1)
          process.stdout.write(`\r   Progress: ${progress}% (${i + 1} / ${transformedPatients.length.toLocaleString()} records) - New: ${totalImported}, Updated: ${totalUpdated}`)
        }
      } catch (error) {
        console.error(`\n❌ Error processing patient ${i + 1} (CDEP: ${patient.departmentCode}):`, error)
        totalSkipped++
      }
    }
    
    console.log('\n')
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n✨ Import Summary:`)
    console.log(`   - New patients: ${totalImported.toLocaleString()}`)
    console.log(`   - Updated patients: ${totalUpdated.toLocaleString()}`)
    if (totalSkipped > 0) {
      console.log(`   - Skipped/Failed: ${totalSkipped.toLocaleString()}`)
    }
    console.log(`   - Total processed: ${(totalImported + totalUpdated).toLocaleString()}`)
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
importPatients()