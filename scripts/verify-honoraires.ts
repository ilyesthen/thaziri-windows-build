/**
 * Verification Script for Actes Honoraires Import
 * 
 * This script verifies that the actes honoraires data was imported correctly.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyImport() {
  try {
    console.log('🔍 Verifying actes honoraires import...\n')

    // Get all imported actes
    const actes = await prisma.actesHonoraires.findMany({
      orderBy: {
        id: 'asc',
      },
    })

    console.log(`📊 Total actes honoraires found: ${actes.length}\n`)

    if (actes.length === 0) {
      console.log('⚠️  No actes honoraires found in database')
      return
    }

    console.log('📋 Sample of imported data:\n')
    console.log('─'.repeat(80))
    console.log(
      'ID'.padEnd(5) +
      'Acte Pratique'.padEnd(30) +
      'Honoraire'.padEnd(15) +
      'Assist1%'.padEnd(12) +
      'Assist2%'
    )
    console.log('─'.repeat(80))

    // Show first 10 records
    actes.slice(0, 10).forEach((acte) => {
      console.log(
        acte.id.toString().padEnd(5) +
        acte.actePratique.padEnd(30).substring(0, 30) +
        `${acte.honoraireEncaisser} DA`.padEnd(15) +
        `${acte.percentageAssistant1}%`.padEnd(12) +
        `${acte.percentageAssistant2}%`
      )
    })

    if (actes.length > 10) {
      console.log('...')
      console.log(`(${actes.length - 10} more records)`)
    }

    console.log('─'.repeat(80))
    console.log('\n✅ Verification completed!\n')

    // Statistics
    const totalHonoraires = actes.reduce((sum, acte) => sum + acte.honoraireEncaisser, 0)
    const avgHonoraire = Math.round(totalHonoraires / actes.length)

    console.log('📈 Statistics:')
    console.log(`   Total fees: ${totalHonoraires.toLocaleString()} DA`)
    console.log(`   Average fee: ${avgHonoraire.toLocaleString()} DA`)
    console.log(`   Max fee: ${Math.max(...actes.map(a => a.honoraireEncaisser)).toLocaleString()} DA`)
    console.log(`   Min fee: ${Math.min(...actes.map(a => a.honoraireEncaisser)).toLocaleString()} DA`)
    console.log()
  } catch (error) {
    console.error('❌ Verification failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run verification
verifyImport()
  .then(() => {
    console.log('🎉 Verification script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Verification script failed:', error)
    process.exit(1)
  })
