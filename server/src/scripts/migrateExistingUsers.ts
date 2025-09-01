import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateExistingUsers() {
  try {
    console.log('🔄 Migrating existing users to set verification status...')
    
    // Find users who don't have a verification status set (null/undefined)
    // and set them as verified (since they were created before the verification system)
    const result = await prisma.user.updateMany({
      where: {
        verified: { equals: null }
      },
      data: {
        verified: true,
        verifiedAt: new Date()
      }
    })
    
    console.log(`✅ Updated ${result.count} existing users to verified status`)
    
    // Also clean up any old verification tokens for these users
    const tokenCleanup = await prisma.verificationToken.deleteMany({
      where: {
        user: {
          verified: true
        },
        type: 'email_verification'
      }
    })
    
    console.log(`🧹 Cleaned up ${tokenCleanup.count} old verification tokens`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateExistingUsers()
    .then(() => {
      console.log('✨ Migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    })
}

export { migrateExistingUsers }