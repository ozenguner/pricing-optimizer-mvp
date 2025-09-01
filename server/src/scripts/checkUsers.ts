import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAndFixUsers() {
  try {
    console.log('🔍 Checking user verification status...')
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        verified: true,
        verifiedAt: true,
        createdAt: true
      }
    })
    
    console.log(`Found ${users.length} users in database:`)
    
    for (const user of users) {
      console.log(`- ${user.email}: verified=${user.verified}, verifiedAt=${user.verifiedAt}`)
    }
    
    // Find users with null/undefined verified status and update them
    const unsetUsers = users.filter(user => user.verified === null || user.verified === undefined)
    
    if (unsetUsers.length > 0) {
      console.log(`\n📝 Updating ${unsetUsers.length} users with unset verification status...`)
      
      for (const user of unsetUsers) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            verified: true,
            verifiedAt: user.createdAt // Use creation date as verification date
          }
        })
        console.log(`✅ Updated ${user.email} to verified status`)
      }
    } else {
      console.log('\n✅ All users have verification status set properly')
    }
    
    // Clean up any verification tokens for verified users
    const tokensDeleted = await prisma.verificationToken.deleteMany({
      where: {
        user: {
          verified: true
        },
        type: 'email_verification'
      }
    })
    
    if (tokensDeleted.count > 0) {
      console.log(`🧹 Cleaned up ${tokensDeleted.count} verification tokens for verified users`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkAndFixUsers()
  .then(() => {
    console.log('\n✨ Check completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Check failed:', error)
    process.exit(1)
  })