/**
 * Quick verification script to check imported patient data
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
  try {
    console.log('🔍 Verifying patient data import...\n')

    // Get total count
    const totalCount = await prisma.patient.count()
    console.log(`✅ Total patients in database: ${totalCount.toLocaleString()}`)

    // Get sample records
    const samplePatients = await prisma.patient.findMany({
      take: 5,
      orderBy: { id: 'asc' },
    })

    console.log('\n📋 Sample patient records:\n')
    samplePatients.forEach((patient, index) => {
      console.log(`${index + 1}. ${patient.firstName} ${patient.lastName}`)
      console.log(`   DOB: ${patient.dateOfBirth?.toLocaleDateString('fr-FR') || 'N/A'}`)
      console.log(`   Age: ${patient.age || 'N/A'}`)
      console.log(`   Address: ${patient.address || 'N/A'}`)
      console.log(`   Phone: ${patient.phone || 'N/A'}`)
      console.log(`   Code: ${patient.code || 'N/A'}`)
      console.log('')
    })

    // Get statistics
    const patientsWithPhone = await prisma.patient.count({
      where: { phone: { not: null } },
    })

    const patientsWithHistory = await prisma.patient.count({
      where: {
        OR: [
          { generalHistory: { not: null } },
          { ophthalmoHistory: { not: null } },
        ],
      },
    })

    console.log('📊 Statistics:')
    console.log(`   Patients with phone: ${patientsWithPhone.toLocaleString()} (${((patientsWithPhone / totalCount) * 100).toFixed(1)}%)`)
    console.log(`   Patients with medical history: ${patientsWithHistory.toLocaleString()} (${((patientsWithHistory / totalCount) * 100).toFixed(1)}%)`)

    console.log('\n✅ Verification completed!\n')
  } catch (error) {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verify()
