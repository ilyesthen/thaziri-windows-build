/**
 * Import Script for Honoraires Transactions
 * 
 * This script imports medical transaction records from 26.xml into the honoraires table.
 * Each record represents a medical act performed for a patient at a specific date/time.
 * 
 * Mapping from 26.xml to honoraires table:
 * - DATE -> date (DD/MM/YYYY format)
 * - HORAIR -> time (HH:MM format)
 * - CDEP -> patient_code (links to Patient.departmentCode)
 * - ACTE -> acte_pratique (e.g. "CONSULTATION")
 * - MONATNT -> montant (amount charged)
 * - MEDCIN -> medecin (doctor name, e.g. "KARKOURI.N")
 * - MT_ASSISTANT -> mt_assistant (assistant amount, optional)
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parseStringPromise } from 'xml2js'

const prisma = new PrismaClient()

interface HonoraireXML {
  IDHONORAIRE: string[]
  DATE: string[]
  HORAIR: string[]
  CDEP: string[]
  ACTE: string[]
  MONATNT: string[]
  MEDCIN: string[]
  MT_ASSISTANT?: string[]
}

async function importHonorairesTransactions() {
  try {
    console.log('🔍 Reading 26.xml file...')
    const xmlPath = path.join(process.cwd(), '26.xml')
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8')

    console.log('📝 Parsing XML...')
    const result = await parseStringPromise(xmlContent)
    
    const tables = result.WINDEV_TABLE?.Table_Contenu || []
    console.log(`✅ Found ${tables.length} honoraire transaction records`)

    // Clear existing data
    console.log('🧹 Clearing existing honoraire records...')
    await prisma.honoraire.deleteMany({})

    let imported = 0
    let skipped = 0
    const batchSize = 100
    
    console.log(`\n📊 Importing in batches of ${batchSize}...\n`)

    for (let i = 0; i < tables.length; i += batchSize) {
      const batch = tables.slice(i, i + batchSize)
      const honoraires = batch.map((record: HonoraireXML) => {
        try {
          const date = record.DATE?.[0] || ''
          const time = record.HORAIR?.[0] || '00:00'
          const patientCode = parseInt(record.CDEP?.[0] || '0')
          const actePratique = record.ACTE?.[0] || ''
          const montant = parseInt(record.MONATNT?.[0] || '0')
          const medecin = record.MEDCIN?.[0] || ''
          const mtAssistant = record.MT_ASSISTANT?.[0] ? parseInt(record.MT_ASSISTANT[0]) : null

          // Skip invalid records
          if (!date || !actePratique || patientCode === 0) {
            skipped++
            return null
          }

          return {
            date,
            time,
            patientCode,
            actePratique,
            montant,
            medecin,
            mtAssistant
          }
        } catch (error) {
          skipped++
          return null
        }
      }).filter(Boolean)

      if (honoraires.length > 0) {
        await prisma.honoraire.createMany({
          data: honoraires as any
        })
        imported += honoraires.length
      }

      // Progress indicator every 1000 records
      if ((i + batchSize) % 1000 === 0 || i + batchSize >= tables.length) {
        const progress = Math.min(i + batchSize, tables.length)
        const percentage = ((progress / tables.length) * 100).toFixed(1)
        console.log(`   ${percentage}% - ${progress}/${tables.length} processed (${imported} imported, ${skipped} skipped)`)
      }
    }

    console.log(`\n✅ Import complete!`)
    console.log(`   ✓ Total records processed: ${tables.length}`)
    console.log(`   ✓ Successfully imported: ${imported}`)
    console.log(`   ✓ Skipped (invalid): ${skipped}`)

    // Show database statistics
    console.log(`\n📊 Database Statistics:`)
    
    const totalRecords = await prisma.honoraire.count()
    console.log(`   ✓ Total honoraires in DB: ${totalRecords}`)

    const uniqueDoctors = await prisma.honoraire.findMany({
      select: { medecin: true },
      distinct: ['medecin']
    })
    console.log(`   ✓ Unique doctors: ${uniqueDoctors.length}`)
    console.log(`   ✓ Doctors: ${uniqueDoctors.map(d => d.medecin).join(', ')}`)

    const uniqueActes = await prisma.honoraire.findMany({
      select: { actePratique: true },
      distinct: ['actePratique']
    })
    console.log(`   ✓ Unique actes: ${uniqueActes.length}`)
    console.log(`   ✓ Actes: ${uniqueActes.map(a => a.actePratique).slice(0, 10).join(', ')}${uniqueActes.length > 10 ? '...' : ''}`)

    // Sample data check
    const sampleRecords = await prisma.honoraire.findMany({
      take: 3,
      orderBy: { date: 'desc' }
    })
    console.log(`\n📋 Sample records (most recent):`)
    sampleRecords.forEach((record, index) => {
      console.log(`   ${index + 1}. ${record.date} ${record.time} - ${record.actePratique} - ${record.montant}DH - Dr. ${record.medecin}`)
    })

  } catch (error) {
    console.error('❌ Error importing honoraires:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

importHonorairesTransactions()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
