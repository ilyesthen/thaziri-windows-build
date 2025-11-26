import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultTemplates = [
  'Dilatation OG',
  'Dilatation OD',
  'Dilatation ODG',
  'RDV 01 année',
  'Faites entrer le malade',
  'On Termine',
  'RDV 06 mois',
  'Pansement',
  'Stop Patients',
  'Faite le une carte de suivi',
  'Viens stp',
  'Desinfection',
  'RDV laser ARGON',
  'Faites entrer post op',
  'Numero de telephone'
]

async function seedTemplates() {
  console.log('🌱 Starting template seeding...')

  try {
    // Check if templates already exist
    const existingCount = await prisma.messageTemplate.count()
    
    if (existingCount > 0) {
      console.log(`ℹ️  Found ${existingCount} existing templates. Skipping seed.`)
      return
    }

    // Insert default templates
    console.log(`📝 Inserting ${defaultTemplates.length} default message templates...`)
    
    for (const content of defaultTemplates) {
      await prisma.messageTemplate.create({
        data: { content }
      })
    }

    console.log(`✅ Successfully seeded ${defaultTemplates.length} message templates!`)
    
    // Verify
    const finalCount = await prisma.messageTemplate.count()
    console.log(`📊 Total templates in database: ${finalCount}`)
    
  } catch (error) {
    console.error('❌ Error seeding templates:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  seedTemplates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export default seedTemplates
