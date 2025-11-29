/**
 * Payments Import Script
 * 
 * Imports payment/honoraires data from payments.xml
 * 
 * Usage: npm run db:import-payments-xml
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

interface XmlPaymentData {
  'N__Enr.'?: string[]
  'CDEP'?: string[]
  'DATE'?: string[]
  'ACTEX'?: string[]
  'MT'?: string[]
  'MEDCIN'?: string[]
  'SEQPAT'?: string[]
}

function getXmlValue(value: string[] | undefined): string | null {
  if (!value || !value[0] || value[0].trim() === '') {
    return null
  }
  return value[0].trim()
}

async function importPayments() {
  const startTime = Date.now()
  
  try {
    console.log('🚀 Starting payments import from payments.xml...\n')
    
    const xmlFilePath = path.join(__dirname, '..', 'payments.xml')
    
    if (!fs.existsSync(xmlFilePath)) {
      console.error(`❌ payments.xml not found at ${xmlFilePath}`)
      process.exit(1)
    }
    
    console.log('📖 Reading payments.xml...')
    const xmlData = fs.readFileSync(xmlFilePath, 'utf-8')
    console.log(`✅ XML loaded (${(xmlData.length / 1024 / 1024).toFixed(2)} MB)`)
    
    console.log('⚙️  Parsing XML...')
    const parsedData = await parseStringPromise(xmlData, {
      explicitArray: true,
      trim: true,
    })
    
    const records = parsedData?.WINDEV_TABLE?.Table_Contenu || []
    console.log(`✅ Found ${records.length.toLocaleString()} payment record(s)\n`)
    
    if (records.length === 0) {
      console.log('⚠️  No records to import')
      return
    }
    
    // Delete existing honoraires
    console.log('🗑️  Clearing existing honoraires...')
    await prisma.honoraire.deleteMany()
    console.log('✅ Cleared\n')
    
    console.log('💾 Importing payments...')
    let imported = 0
    let skipped = 0
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i] as XmlPaymentData
      
      try {
        const patientCode = getXmlValue(record.CDEP)
        const date = getXmlValue(record.DATE)
        const actex = getXmlValue(record.ACTEX)
        
        if (!patientCode || !date) {
          skipped++
          continue
        }
        
        const montant = record.MT ? parseFloat(getXmlValue(record.MT) || '0') : 0
        
        await prisma.honoraire.create({
          data: {
            patientCode: parseInt(patientCode),
            date,
            actex: actex || 'CONSULTATION',
            montant,
            medecin: getXmlValue(record.MEDCIN),
            seqpat: record.SEQPAT ? parseInt(getXmlValue(record.SEQPAT) || '0') : null,
          }
        })
        
        imported++
        
        if ((i + 1) % 100 === 0 || i === records.length - 1) {
          const progress = ((i + 1) / records.length * 100).toFixed(1)
          process.stdout.write(`\r   Progress: ${progress}% (${imported.toLocaleString()} imported, ${skipped} skipped)`)
        }
      } catch (error) {
        console.error(`\n❌ Error importing payment ${i + 1}:`, error)
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

importPayments()
