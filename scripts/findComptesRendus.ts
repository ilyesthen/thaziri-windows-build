import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findComptesRendus() {
  try {
    console.log('🔍 Searching for patients with Compte Rendu...\n')
    
    const comptesRendus = await prisma.ordonnance.findMany({
      where: {
        OR: [
          { actex: 'COMPTE RENDU' },
          { actex: 'COMPTE RENDU MEDICAL' }
        ]
      },
      take: 10,
      orderBy: {
        dateOrd: 'desc'
      }
    })
    
    console.log(`Found ${comptesRendus.length} Compte Rendu records\n`)
    
    if (comptesRendus.length > 0) {
      for (const cr of comptesRendus) {
        // Get patient details
        const patient = await prisma.patient.findFirst({
          where: { departmentCode: cr.patientCode }
        })
        
        console.log(`Patient: ${patient?.lastName} ${patient?.firstName}`)
        console.log(`  Code: ${cr.patientCode}`)
        console.log(`  Date: ${cr.dateOrd}`)
        console.log(`  Acte: ${cr.actex}`)
        console.log(`  Content length: ${cr.strait?.length || 0} characters`)
        console.log(`---`)
      }
    } else {
      console.log('❌ No Compte Rendu records found in database')
      console.log('\n💡 Checking all actex types in database:')
      
      const allActes = await prisma.ordonnance.findMany({
        select: {
          actex: true
        },
        distinct: ['actex'],
        take: 20
      })
      
      console.log('Available actex types:', allActes.map(a => a.actex).join(', '))
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findComptesRendus()
