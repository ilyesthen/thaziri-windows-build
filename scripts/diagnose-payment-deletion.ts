import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnose() {
  console.log('\n🔍 DIAGNOSTIC: Payment Deletion Issue\n')
  
  // Get patient info
  const patientName = 'KARKOURI'
  const patients = await prisma.patient.findMany({
    where: {
      lastName: {
        contains: patientName
      }
    }
  })
  
  console.log(`📋 Found ${patients.length} patient(s) matching "${patientName}":`)
  patients.forEach(p => {
    console.log(`  - ID: ${p.id}, Name: ${p.firstName} ${p.lastName}, Dept Code: ${p.departmentCode}`)
  })
  
  if (patients.length === 0) {
    console.log('❌ No patients found!')
    await prisma.$disconnect()
    return
  }
  
  const patient = patients[0]
  console.log(`\n🎯 Using patient: ${patient.firstName} ${patient.lastName} (Dept Code: ${patient.departmentCode})\n`)
  
  // Get today's date in different formats
  const today = new Date()
  const yyyymmdd = today.toISOString().split('T')[0] // YYYY-MM-DD
  const ddmmyyyy = today.toLocaleDateString('fr-FR') // DD/MM/YYYY
  const [day, month, year] = ddmmyyyy.split('/')
  const dmyyyy = `${parseInt(day)}/${parseInt(month)}/${year}` // D/M/YYYY
  
  console.log(`📅 Today's date formats:`)
  console.log(`  - YYYY-MM-DD: ${yyyymmdd}`)
  console.log(`  - DD/MM/YYYY: ${ddmmyyyy}`)
  console.log(`  - D/M/YYYY: ${dmyyyy}`)
  
  // Check honoraires for this patient
  console.log(`\n💰 Honoraires for patient ${patient.departmentCode}:`)
  const allHonoraires = await prisma.honoraire.findMany({
    where: {
      patientCode: patient.departmentCode || 0
    }
  })
  
  console.log(`  Found ${allHonoraires.length} total honoraire(s)`)
  allHonoraires.forEach(h => {
    console.log(`    - Date: "${h.date}", Time: ${h.time}, Act: ${h.actePratique}, Amount: ${h.montant} DA, Medecin: ${h.medecin}`)
  })
  
  // Check payment validations for this patient
  console.log(`\n💳 Payment Validations for patient ${patient.departmentCode}:`)
  const payments = await prisma.paymentValidation.findMany({
    where: {
      patientCode: patient.departmentCode || 0
    }
  })
  
  console.log(`  Found ${payments.length} payment validation(s)`)
  payments.forEach(p => {
    console.log(`    - Date: "${p.visitDate}", Status: ${p.status}, Amount: ${p.totalAmount} DA, By: ${p.validatedBy}`)
  })
  
  // Try to find today's honoraires with each date format
  console.log(`\n🔍 Testing date format matches:`)
  for (const dateFormat of [yyyymmdd, ddmmyyyy, dmyyyy]) {
    const matches = await prisma.honoraire.findMany({
      where: {
        patientCode: patient.departmentCode || 0,
        date: dateFormat
      }
    })
    console.log(`  - "${dateFormat}": ${matches.length} match(es)`)
  }
  
  await prisma.$disconnect()
}

diagnose().catch(console.error)
