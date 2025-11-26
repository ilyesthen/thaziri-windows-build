/**
 * Import visit examinations from JSON export
 * This imports the full 112,827 visit records
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

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

async function importVisitsFromJSON() {
  const startTime = Date.now()
  
  try {
    const jsonPath = path.join(__dirname, '..', 'export', 'thaziri-export-2025-11-21.json')
    
    console.log('🚀 Starting visit import from JSON export...\n')
    console.log('📖 Reading JSON export file...')
    
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ Error: JSON file not found at ${jsonPath}`)
      process.exit(1)
    }
    
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8')
    console.log(`✅ JSON file loaded (${(jsonContent.length / 1024 / 1024).toFixed(2)} MB)`)
    
    console.log('🔍 Parsing JSON data...')
    const exportData = JSON.parse(jsonContent)
    
    if (!exportData.data?.visitExaminations) {
      console.error('❌ No visit examinations found in JSON export')
      process.exit(1)
    }
    
    const visits = exportData.data.visitExaminations
    console.log(`\n📊 Found ${visits.length.toLocaleString()} visit examinations in export\n`)
    
    console.log('💾 Importing visits in database (batch mode)...\n')
    
    const BATCH_SIZE = 2000
    let imported = 0
    
    for (let i = 0; i < visits.length; i += BATCH_SIZE) {
      const batch = visits.slice(i, i + BATCH_SIZE)
      
      // Clean the data - remove id, createdAt, updatedAt
      const cleanedBatch = batch.map((visit: any) => {
        const { id, createdAt, updatedAt, ...visitData } = visit
        return visitData
      })
      
      try {
        const result = await prisma.visitExamination.createMany({
          data: cleanedBatch
        })
        
        imported += result.count
        const progress = ((i + batch.length) / visits.length * 100).toFixed(1)
        process.stdout.write(`\r   Progress: ${progress}% (${imported.toLocaleString()} / ${visits.length.toLocaleString()} records)`)
      } catch (error) {
        console.error(`\n❌ Error importing batch at position ${i}:`, error)
      }
    }
    
    console.log('\n')
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log('\n✨ Import Summary:')
    console.log(`   - Visits imported: ${imported.toLocaleString()}`)
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
importVisitsFromJSON()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
