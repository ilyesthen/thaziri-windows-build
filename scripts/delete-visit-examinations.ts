import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteAllVisitExaminations() {
  try {
    console.log('🗑️  Deleting all visit examination data...');
    
    const result = await prisma.visitExamination.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.count} visit examination records`);
    console.log('🎉 Database cleaned! Ready for fresh import.');
    
  } catch (error) {
    console.error('❌ Error deleting visit examinations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the deletion
deleteAllVisitExaminations()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
