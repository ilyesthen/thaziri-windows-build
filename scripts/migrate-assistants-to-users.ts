import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateAssistantsToUsers() {
  try {
    console.log('🔄 Starting migration: Assistant Users → Real Users')
    
    // Get all assistant users
    const assistantUsers = await prisma.assistantUser.findMany()
    console.log(`Found ${assistantUsers.length} assistant users to migrate`)
    
    if (assistantUsers.length === 0) {
      console.log('✅ No assistant users to migrate')
      return
    }
    
    // Get the default password from Assistant 1 or Assistant 2 role accounts
    const assistant1 = await prisma.user.findFirst({
      where: { role: 'assistant_1' }
    })
    const assistant2 = await prisma.user.findFirst({
      where: { role: 'assistant_2' }
    })
    
    let migratedCount = 0
    let skippedCount = 0
    
    for (const assistant of assistantUsers) {
      const email = `${assistant.fullName.toLowerCase().replace(/\s+/g, '.')}@assistant.local`
      
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })
      
      if (existingUser) {
        console.log(`⏭️  Skipping ${assistant.fullName} - user already exists`)
        skippedCount++
        continue
      }
      
      // Determine which role account to use
      const roleAccount = assistant.role === 'assistant_1' ? assistant1 : assistant2
      if (!roleAccount) {
        console.log(`⚠️  Skipping ${assistant.fullName} - no ${assistant.role} account found`)
        skippedCount++
        continue
      }
      
      // Create real user with the assistant's data
      await prisma.user.create({
        data: {
          email,
          name: assistant.fullName,
          password: roleAccount.password, // Use the same hashed password as the role account
          role: assistant.role,
          defaultPercentage: assistant.percentage,
          createdAt: assistant.createdAt,
          updatedAt: assistant.updatedAt
        }
      })
      
      console.log(`✅ Migrated ${assistant.fullName} to users table`)
      migratedCount++
    }
    
    console.log(`\n📊 Migration Summary:`)
    console.log(`   ✅ Migrated: ${migratedCount}`)
    console.log(`   ⏭️  Skipped: ${skippedCount}`)
    console.log(`   📝 Total: ${assistantUsers.length}`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateAssistantsToUsers()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error)
    process.exit(1)
  })
