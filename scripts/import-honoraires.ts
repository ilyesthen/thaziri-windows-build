/**
 * Import Script for Actes Honoraires
 * 
 * This script imports medical acts and fees from 44.xml into the actes_honoraires table.
 * 
 * Mapping:
 * - HON -> acte_pratique (Medical act name)
 * - MT -> honoraire_encaisser (Fee to collect)
 * - percentage_assistant_1 -> 0 (default, to be set manually via UI)
 * - percentage_assistant_2 -> 0 (default, to be set manually via UI)
 * 
 * Note: mt_corresp and mt_corresp1 fields are ignored as per requirements
 */

import { promises as fs } from 'fs'
import { parseStringPromise } from 'xml2js'
import { PrismaClient } from '@prisma/client'
import path from 'path'

const prisma = new PrismaClient()

interface TableContenu {
  'N__Enr.': string[]
  IDTAB_HON: string[]
  HON: string[]
  MT: string[]
  mt_corresp: string[]
  mt_corresp1: string[]
}

interface XMLData {
  WINDEV_TABLE: {
    Table_Contenu: TableContenu[]
  }
}

async function importHonoraires() {
  try {
    console.log('🚀 Starting import of actes honoraires...\n')

    // Read the XML file
    const xmlPath = path.join(process.cwd(), '44.xml')
    console.log(`📖 Reading XML file: ${xmlPath}`)
    
    const xmlContent = await fs.readFile(xmlPath, 'utf-8')
    
    // Parse XML
    console.log('🔍 Parsing XML...')
    const parsedData = await parseStringPromise(xmlContent, {
      explicitArray: true,
      trim: true,
    }) as XMLData

    const tableContents = parsedData.WINDEV_TABLE.Table_Contenu

    if (!tableContents || tableContents.length === 0) {
      console.error('❌ No data found in XML file')
      return
    }

    console.log(`✅ Found ${tableContents.length} actes honoraires to import\n`)

    // Clear existing data (optional - remove if you want to keep existing data)
    console.log('🗑️  Clearing existing actes honoraires...')
    await prisma.actesHonoraires.deleteMany({})

    let importedCount = 0
    let skippedCount = 0

    // Import each record
    for (const record of tableContents) {
      try {
        const actePratique = record.HON?.[0]?.trim()
        const honoraireStr = record.MT?.[0]?.trim()

        if (!actePratique) {
          console.log(`⚠️  Skipping record - missing acte pratique`)
          skippedCount++
          continue
        }

        const honoraireEncaisser = honoraireStr ? parseInt(honoraireStr, 10) : 0

        await prisma.actesHonoraires.create({
          data: {
            actePratique,
            honoraireEncaisser,
            percentageAssistant1: 0,
            percentageAssistant2: 0,
          },
        })

        importedCount++
        console.log(`✅ Imported: ${actePratique} - ${honoraireEncaisser} DA`)
      } catch (error) {
        console.error(`❌ Failed to import record:`, error)
        skippedCount++
      }
    }

    console.log('\n📊 Import Summary:')
    console.log(`   ✅ Successfully imported: ${importedCount}`)
    console.log(`   ⚠️  Skipped: ${skippedCount}`)
    console.log(`   📋 Total records: ${tableContents.length}`)
    console.log('\n✨ Import completed!\n')
  } catch (error) {
    console.error('❌ Import failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
importHonoraires()
  .then(() => {
    console.log('🎉 Script execution completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Script execution failed:', error)
    process.exit(1)
  })
