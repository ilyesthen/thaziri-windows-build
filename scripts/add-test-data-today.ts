/**
 * Add test data for today (30/10/2025) to test Comptabilité du Jour
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addTestData() {
  try {
    console.log('🧪 Adding test data for 30/10/2025...\n')

    const testDate = '30/10/2025'
    
    // Test records with various acts
    const testRecords = [
      { time: '08:30', patientCode: 1, acte: 'CONSULTATION', montant: 2000, mtAssistant: 2000 },
      { time: '09:00', patientCode: 2, acte: 'CONSULTATION', montant: 2000, mtAssistant: 2000 },
      { time: '09:30', patientCode: 3, acte: 'CONSULTATION +FO', montant: 2500, mtAssistant: 2500 },
      { time: '10:00', patientCode: 5, acte: 'V3M 2 Yeux', montant: 3000, mtAssistant: 3000 },
      { time: '10:30', patientCode: 10, acte: 'CONSULTATION', montant: 2000, mtAssistant: 2000 },
      { time: '11:00', patientCode: 15, acte: 'VL  1  SEUL  OEIL', montant: 1500, mtAssistant: 1500 },
      { time: '11:30', patientCode: 20, acte: 'CONSULTATION', montant: 2000, mtAssistant: 2000 },
      { time: '14:00', patientCode: 25, acte: 'CONSULTATION SPECIALE', montant: 3500, mtAssistant: 3500 },
      { time: '14:30', patientCode: 30, acte: 'CONSULTATION', montant: 2000, mtAssistant: 2000 },
      { time: '15:00', patientCode: 35, acte: 'CONSULTATION +FO', montant: 2500, mtAssistant: 2500 },
      { time: '15:30', patientCode: 40, acte: 'GRATUIT', montant: 0, mtAssistant: 0 },
      { time: '16:00', patientCode: 45, acte: 'CONSULTATION', montant: 2000, mtAssistant: 2000 },
    ]

    for (const record of testRecords) {
      await prisma.honoraire.create({
        data: {
          date: testDate,
          time: record.time,
          patientCode: record.patientCode,
          actePratique: record.acte,
          montant: record.montant,
          medecin: 'KARKOURI.N',
          mtAssistant: record.mtAssistant
        }
      })
    }

    console.log(`✅ Added ${testRecords.length} test records for ${testDate}`)
    
    // Show summary
    const total = testRecords.reduce((sum, r) => sum + r.montant, 0)
    console.log(`💰 Total: ${total.toLocaleString()} DA`)
    
  } catch (error) {
    console.error('❌ Error adding test data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addTestData()
