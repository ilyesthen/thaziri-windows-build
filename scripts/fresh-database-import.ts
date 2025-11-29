/**
 * FRESH DATABASE IMPORT - Master Script
 * 
 * This script creates a completely fresh database by:
 * 1. Clearing ALL existing data
 * 2. Importing NEW data from 4 XML files:
 *    - patients.xml → patients
 *    - visits.xml → visit_examinations
 *    - payments.xml → honoraires
 *    - ordononce.xml → ordonnances (prescriptions, bilan, comptes rendus)
 * 
 * ⚠️  WARNING: This will DELETE all existing data!
 * 
 * Usage: npm run db:fresh-import
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { parseStringPromise } from 'xml2js'
import { execSync } from 'child_process'

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

function getXmlValue(value: string[] | undefined): string | null {
  if (!value || !value[0] || value[0].trim() === '') {
    return null
  }
  return value[0].trim()
}

async function clearAllData() {
  console.log('🗑️  CLEARING ALL EXISTING DATA...\n')
  
  try {
    // Clear in correct order (respecting foreign keys)
    await prisma.ordonnance.deleteMany()
    console.log('   ✅ Cleared ordonnances')
    
    await prisma.honoraire.deleteMany()
    console.log('   ✅ Cleared honoraires/payments')
    
    await prisma.visitExamination.deleteMany()
    console.log('   ✅ Cleared visit_examinations')
    
    await prisma.patient.deleteMany()
    console.log('   ✅ Cleared patients')
    
    console.log('\n✅ All data cleared successfully!\n')
  } catch (error) {
    console.error('❌ Error clearing data:', error)
    throw error
  }
}

async function importPatients() {
  console.log('═══════════════════════════════════════════════')
  console.log('📋 STEP 1/4: IMPORTING PATIENTS')
  console.log('═══════════════════════════════════════════════\n')
  
  const xmlPath = path.join(projectRoot, 'patients.xml')
  if (!fs.existsSync(xmlPath)) {
    console.error(`❌ patients.xml not found`)
    return 0
  }
  
  console.log('📖 Reading patients.xml...')
  const xmlData = fs.readFileSync(xmlPath, 'utf-8')
  console.log(`✅ Loaded (${(xmlData.length / 1024 / 1024).toFixed(2)} MB)`)
  
  const parsedData = await parseStringPromise(xmlData, { explicitArray: true, trim: true })
  const records = parsedData?.WINDEV_TABLE?.Table_Contenu || []
  console.log(`📊 Found ${records.length.toLocaleString()} patient(s)`)
  
  let imported = 0
  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    const firstName = getXmlValue(r.PRP)
    const lastName = getXmlValue(r.NOMP)
    
    if (!firstName || !lastName) continue
    
    try {
      await prisma.patient.create({
        data: {
          departmentCode: r.CDEP ? parseInt(getXmlValue(r.CDEP) || '0') : undefined,
          firstName,
          lastName,
          fullName: getXmlValue(r.NOP) || `${firstName} ${lastName}`,
          dateOfBirth: r.DATEN ? new Date(getXmlValue(r.DATEN) || '') : undefined,
          address: getXmlValue(r.ADP),
          phone: getXmlValue(r.TEL),
          code: getXmlValue(r.CODE_B),
          usefulInfo: getXmlValue(r.INFOR_UTILES),
          generalHistory: getXmlValue(r.ATCDG),
          ophthalmoHistory: getXmlValue(r.ATCDO),
        }
      })
      imported++
      if ((i + 1) % 50 === 0) process.stdout.write(`\r   Progress: ${((i + 1) / records.length * 100).toFixed(1)}%`)
    } catch (error) {
      // Skip invalid records
    }
  }
  
  console.log(`\n✅ Imported ${imported.toLocaleString()} patients\n`)
  return imported
}

async function importVisits() {
  console.log('═══════════════════════════════════════════════')
  console.log('🏥 STEP 2/4: IMPORTING VISITS')
  console.log('═══════════════════════════════════════════════\n')
  
  const xmlPath = path.join(projectRoot, 'visits.xml')
  if (!fs.existsSync(xmlPath)) {
    console.error(`❌ visits.xml not found`)
    return 0
  }
  
  console.log('📖 Reading visits.xml...')
  const xmlData = fs.readFileSync(xmlPath, 'utf-8')
  console.log(`✅ Loaded (${(xmlData.length / 1024 / 1024).toFixed(2)} MB)`)
  
  const parsedData = await parseStringPromise(xmlData, { explicitArray: true, trim: true })
  const records = parsedData?.WINDEV_TABLE?.Table_Contenu || []
  console.log(`📊 Found ${records.length.toLocaleString()} visit(s)`)
  
  let imported = 0
  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    const patientCode = getXmlValue(r.CDEP)
    const visitDate = getXmlValue(r.DATECLI)
    
    if (!patientCode || !visitDate) continue
    
    try {
      await prisma.visitExamination.create({
        data: {
          patientCode: parseInt(patientCode),
          visitDate,
          medecin: getXmlValue(r.MEDCIN),
          motif: getXmlValue(r.MOTIF),
          scod: getXmlValue(r.SCOD),
          avod: getXmlValue(r.AVOD),
          sphereOd: getXmlValue(r.p1),
          cylindreOd: getXmlValue(r.p2),
          axeOd: getXmlValue(r.AXD),
          vlOd: getXmlValue(r.p4) || getXmlValue(r.vpppD),
          scog: getXmlValue(r.SCOG),
          avog: getXmlValue(r.AVOG),
          sphereOg: getXmlValue(r.p3),
          cylindreOg: getXmlValue(r.p5),
          axeOg: getXmlValue(r.AXG),
          vlOg: getXmlValue(r.p6) || getXmlValue(r.p7),
          dip: getXmlValue(r.EP),
          cycloplegie: getXmlValue(r.cycloplégie),
          conduiteATenir: getXmlValue(r.CAT),
          diagnostic: getXmlValue(r.DIAG) || getXmlValue(r.DIIAG),
        }
      })
      imported++
      if ((i + 1) % 50 === 0) process.stdout.write(`\r   Progress: ${((i + 1) / records.length * 100).toFixed(1)}%`)
    } catch (error) {
      // Skip invalid records
    }
  }
  
  console.log(`\n✅ Imported ${imported.toLocaleString()} visits\n`)
  return imported
}

async function importPayments() {
  console.log('═══════════════════════════════════════════════')
  console.log('💰 STEP 3/4: IMPORTING PAYMENTS')
  console.log('═══════════════════════════════════════════════\n')
  
  const xmlPath = path.join(projectRoot, 'payments.xml')
  if (!fs.existsSync(xmlPath)) {
    console.error(`❌ payments.xml not found`)
    return 0
  }
  
  console.log('📖 Reading payments.xml...')
  const xmlData = fs.readFileSync(xmlPath, 'utf-8')
  console.log(`✅ Loaded (${(xmlData.length / 1024 / 1024).toFixed(2)} MB)`)
  
  const parsedData = await parseStringPromise(xmlData, { explicitArray: true, trim: true })
  const records = parsedData?.WINDEV_TABLE?.Table_Contenu || []
  console.log(`📊 Found ${records.length.toLocaleString()} payment(s)`)
  
  let imported = 0
  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    const patientCode = getXmlValue(r.CDEP)
    const date = getXmlValue(r.DATE)
    
    if (!patientCode || !date) continue
    
    try {
      await prisma.honoraire.create({
        data: {
          patientCode: parseInt(patientCode),
          date,
          actex: getXmlValue(r.ACTEX) || 'CONSULTATION',
          montant: r.MT ? parseFloat(getXmlValue(r.MT) || '0') : 0,
          medecin: getXmlValue(r.MEDCIN) || '',
          seqpat: r.SEQPAT ? parseInt(getXmlValue(r.SEQPAT) || '0') : null,
        }
      })
      imported++
      if ((i + 1) % 50 === 0) process.stdout.write(`\r   Progress: ${((i + 1) / records.length * 100).toFixed(1)}%`)
    } catch (error) {
      // Skip invalid records
    }
  }
  
  console.log(`\n✅ Imported ${imported.toLocaleString()} payments\n`)
  return imported
}

async function importOrdonnances() {
  console.log('═══════════════════════════════════════════════')
  console.log('📝 STEP 4/4: IMPORTING ORDONNANCES')
  console.log('═══════════════════════════════════════════════\n')
  
  const xmlPath = path.join(projectRoot, 'ordononce.xml')
  if (!fs.existsSync(xmlPath)) {
    console.error(`❌ ordononce.xml not found`)
    return 0
  }
  
  console.log('📖 Reading ordononce.xml...')
  const xmlData = fs.readFileSync(xmlPath, 'utf-8')
  console.log(`✅ Loaded (${(xmlData.length / 1024 / 1024).toFixed(2)} MB)`)
  
  const parsedData = await parseStringPromise(xmlData, { explicitArray: true, trim: true })
  const records = parsedData?.WINDEV_TABLE?.Table_Contenu || []
  console.log(`📊 Found ${records.length.toLocaleString()} ordonnance(s)`)
  
  let imported = 0
  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    const patientCode = getXmlValue(r.CDEP)
    
    if (!patientCode) continue
    
    try {
      await prisma.ordonnance.create({
        data: {
          patientCode: parseInt(patientCode),
          dateOrd: getXmlValue(r.DATEORD) || '',
          age: r.AG2 ? parseInt(getXmlValue(r.AG2) || '0') : null,
          seq: r.SEQ ? parseInt(getXmlValue(r.SEQ) || '0') : null,
          strait: getXmlValue(r.STRAIT) || '',
          strait1: getXmlValue(r.strait1) || '',
          strait2: getXmlValue(r.strait2) || '',
          strait3: getXmlValue(r.strait3) || '',
          medecin: getXmlValue(r.MEDCIN) || '',
          actex: getXmlValue(r.ACTEX) || 'ORDONNANCE',
          seqpat: r.SEQPAT ? parseInt(getXmlValue(r.SEQPAT) || '0') : null,
        }
      })
      imported++
      if ((i + 1) % 50 === 0) process.stdout.write(`\r   Progress: ${((i + 1) / records.length * 100).toFixed(1)}%`)
    } catch (error) {
      // Skip invalid records
    }
  }
  
  console.log(`\n✅ Imported ${imported.toLocaleString()} ordonnances\n`)
  
  // Show breakdown
  const prescriptions = await prisma.ordonnance.count({ where: { actex: { contains: 'ORDONNANCE' } } })
  const bilan = await prisma.ordonnance.count({ where: { OR: [{ actex: { contains: 'BILAN' } }, { actex: { contains: 'CERTIFICAT' } }] } })
  const comptes = await prisma.ordonnance.count({ where: { actex: { contains: 'COMPTE RENDU' } } })
  
  console.log(`📋 Breakdown:`)
  console.log(`   - 📝 Prescriptions: ${prescriptions.toLocaleString()}`)
  console.log(`   - 🧪 Bilan: ${bilan.toLocaleString()}`)
  console.log(`   - 📄 Comptes Rendus: ${comptes.toLocaleString()}\n`)
  
  return imported
}

async function main() {
  const startTime = Date.now()
  
  console.log('\n')
  console.log('═══════════════════════════════════════════════')
  console.log('🚀 FRESH DATABASE IMPORT')
  console.log('═══════════════════════════════════════════════')
  console.log('⚠️  This will DELETE all existing data!')
  console.log('═══════════════════════════════════════════════\n')
  
  try {
    // Step 0: Clear all data
    await clearAllData()
    
    // Step 1-4: Import new data
    const patientsCount = await importPatients()
    const visitsCount = await importVisits()
    const paymentsCount = await importPayments()
    const ordonnancesCount = await importOrdonnances()
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    console.log('═══════════════════════════════════════════════')
    console.log('✨ IMPORT COMPLETE!')
    console.log('═══════════════════════════════════════════════')
    console.log(`📊 Summary:`)
    console.log(`   - Patients: ${patientsCount.toLocaleString()}`)
    console.log(`   - Visits: ${visitsCount.toLocaleString()}`)
    console.log(`   - Payments: ${paymentsCount.toLocaleString()}`)
    console.log(`   - Ordonnances: ${ordonnancesCount.toLocaleString()}`)
    console.log(`   - Duration: ${duration}s`)
    console.log('═══════════════════════════════════════════════\n')
    
    console.log('✅ Database is ready with fresh data!')
    console.log('💡 You can now copy prisma/dev.db to your admin PC\n')
    
  } catch (error) {
    console.error('\n❌ Import failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
