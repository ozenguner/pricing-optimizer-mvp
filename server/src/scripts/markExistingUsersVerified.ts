import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function markExistingUsersVerified() {
  try {
    console.log('🔄 Marking existing users as verified...')
    console.log('⚠️  This will mark ALL existing users as verified without email verification.')
    console.log('   Only run this if these are legitimate existing users from before email verification was implemented.')
    
    // Get all unverified users
    const unverifiedUsers = await prisma.user.findMany({
      where: {
        verified: false
      },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    })
    
    if (unverifiedUsers.length === 0) {
      console.log('✅ No unverified users found')
      return
    }
    
    console.log(`\nFound ${unverifiedUsers.length} unverified users:`)
    unverifiedUsers.forEach(user => {
      console.log(`- ${user.email} (created: ${user.createdAt.toISOString()})`)
    })
    
    // Mark all as verified
    const result = await prisma.user.updateMany({
      where: {
        verified: false
      },
      data: {
        verified: true,
        verifiedAt: new Date()
      }
    })
    
    console.log(`\n✅ Marked ${result.count} users as verified`)
    
    // Clean up verification tokens
    const tokenCleanup = await prisma.verificationToken.deleteMany({
      where: {
        type: 'email_verification'
      }
    })
    
    console.log(`🧹 Deleted ${tokenCleanup.count} verification tokens`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

markExistingUsersVerified()
  .then(() => {
    console.log('\n✨ Migration completed successfully!')
    console.log('🔐 All existing users are now marked as verified and can log in immediately.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })