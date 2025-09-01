import { EmailService, EmailTemplateService } from '../services/email/index.js'

async function testEmailService() {
  try {
    console.log('🚀 Testing Email Service...')
    
    // Initialize services
    const emailService = new EmailService()
    const templateService = new EmailTemplateService(emailService)
    
    // Check service health
    console.log('\n📊 Email Service Status:')
    const health = await emailService.healthCheck()
    console.log('Healthy:', health.healthy)
    console.log('Providers:', health.providers)
    
    // Test verification email
    console.log('\n📧 Testing verification email...')
    
    const testEmailResult = await templateService.sendVerificationEmail(
      { email: 'test@example.com', name: 'Test User' },
      {
        userEmail: 'test@example.com',
        userName: 'Test User',
        verificationUrl: 'http://localhost:3000/verify-email/complete?token=test-token-123',
        verificationToken: 'test-token-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        baseUrl: 'http://localhost:3000',
        supportEmail: 'support@ratecardlab.com'
      }
    )
    
    if (testEmailResult.success) {
      console.log('✅ Verification email sent successfully!')
      console.log('Provider used:', testEmailResult.provider)
      console.log('Message ID:', testEmailResult.messageId)
      
      if (testEmailResult.provider === 'Ethereal') {
        console.log('\n🔍 For Ethereal emails:')
        console.log('- Check the server console for Ethereal preview URLs')
        console.log('- Preview URLs look like: https://ethereal.email/message/[message-id]')
        console.log('- Or check the email service logs for the preview link')
      }
    } else {
      console.error('❌ Verification email failed:', testEmailResult.error)
    }
    
    // Show recent email stats
    console.log('\n📊 Email Statistics:')
    const stats = emailService.getEmailStats()
    console.log(stats)
    
    // Show recent logs
    console.log('\n📜 Recent Email Logs:')
    const logs = emailService.getRecentLogs(5)
    logs.forEach(log => {
      console.log(`[${log.timestamp.toISOString()}] ${log.type} - ${log.provider}: ${log.subject || 'N/A'}`)
    })
    
  } catch (error) {
    console.error('❌ Email test failed:', error)
    throw error
  }
}

testEmailService()
  .then(() => {
    console.log('\n✨ Email test completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Email test failed:', error)
    process.exit(1)
  })