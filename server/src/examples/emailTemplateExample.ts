/**
 * Example usage of the Email Template System
 * 
 * This file demonstrates how to use the EmailTemplateService
 * for sending verification emails, welcome emails, and custom templates.
 */

import { EmailService, EmailTemplateService } from '../services/email/index.js';

async function exampleEmailVerificationFlow() {
  try {
    // Initialize services
    const emailService = new EmailService();
    const templateService = new EmailTemplateService(emailService);

    // Precompile templates for better performance
    await templateService.precompileTemplates();

    // Example 1: Send verification email
    console.log('Sending verification email...');
    
    const verificationResult = await templateService.sendVerificationEmail(
      { email: 'user@example.com', name: 'John Doe' },
      {
        userEmail: 'user@example.com',
        userName: 'John Doe',
        verificationUrl: 'https://ratecardlab.com/verify?token=abc123',
        verificationToken: 'abc123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        baseUrl: 'https://ratecardlab.com',
        supportEmail: 'support@ratecardlab.com'
      }
    );

    if (verificationResult.success) {
      console.log('✅ Verification email sent successfully!');
      console.log(`Message ID: ${verificationResult.messageId}`);
      console.log(`Provider: ${verificationResult.provider}`);
    } else {
      console.error('❌ Failed to send verification email:', verificationResult.error);
    }

    // Example 2: Send welcome email after verification
    console.log('\nSending welcome email...');
    
    const welcomeResult = await templateService.sendWelcomeEmail(
      { email: 'user@example.com', name: 'John Doe' },
      {
        userEmail: 'user@example.com',
        userName: 'John Doe',
        dashboardUrl: 'https://ratecardlab.com/dashboard',
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        verifiedAt: new Date(),
        baseUrl: 'https://ratecardlab.com',
        supportEmail: 'support@ratecardlab.com'
      }
    );

    if (welcomeResult.success) {
      console.log('✅ Welcome email sent successfully!');
      console.log(`Message ID: ${welcomeResult.messageId}`);
    } else {
      console.error('❌ Failed to send welcome email:', welcomeResult.error);
    }

    // Example 3: Template validation
    console.log('\nValidating templates...');
    
    const sampleData = templateService.generateSampleVerificationData();
    const validationResult = await templateService.validateTemplate('email-verification', sampleData);
    
    if (validationResult.valid) {
      console.log('✅ Template validation passed');
    } else {
      console.error('❌ Template validation failed:', validationResult.error);
    }

    // Example 4: Get service status
    console.log('\nEmail Service Status:');
    const healthCheck = await emailService.healthCheck();
    console.log('Service Healthy:', healthCheck.healthy);
    console.log('Available Providers:', healthCheck.providers);
    
    const stats = emailService.getEmailStats();
    console.log('Email Statistics:', stats);

    // Example 5: Template cache information
    console.log('\nTemplate Cache Status:');
    console.log('Cached Templates:', templateService.getCachedTemplates());
    console.log('Template Directory:', templateService.getTemplateDir());

  } catch (error) {
    console.error('❌ Error in email template example:', error);
  }
}

async function exampleTemplateRendering() {
  try {
    console.log('\n=== Template Rendering Examples ===');
    
    const emailService = new EmailService();
    const templateService = new EmailTemplateService(emailService);

    // Example: Render template without sending
    const sampleData = templateService.generateSampleVerificationData();
    
    // This would render the HTML (but we can't display it in console effectively)
    console.log('Sample verification data generated for testing:');
    console.log({
      userEmail: sampleData.userEmail,
      userName: sampleData.userName,
      expiresAt: sampleData.expiresAt,
      hasVerificationUrl: !!sampleData.verificationUrl
    });

    // Example: Check if templates exist
    const templates = ['base', 'email-verification', 'welcome'];
    for (const template of templates) {
      const exists = await templateService.templateExists(template);
      console.log(`Template "${template}": ${exists ? '✅ Found' : '❌ Missing'}`);
    }

  } catch (error) {
    console.error('❌ Error in template rendering example:', error);
  }
}

async function exampleEmailServiceConfiguration() {
  try {
    console.log('\n=== Email Service Configuration ===');
    
    const emailService = new EmailService();
    
    // Get provider status
    const providerStatus = emailService.getProviderStatus();
    console.log('Email Providers:');
    providerStatus.forEach(provider => {
      console.log(`  ${provider.name}: ${provider.configured ? '✅ Configured' : '❌ Not Configured'} (Priority: ${provider.priority})`);
    });

    // Get recent logs (if any)
    const recentLogs = emailService.getRecentLogs(5);
    console.log(`\nRecent Email Logs (${recentLogs.length} entries):`);
    recentLogs.forEach(log => {
      console.log(`  ${log.timestamp.toISOString()} [${log.type}] ${log.provider}: ${log.subject || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Error in configuration example:', error);
  }
}

// Main example function
async function runEmailExamples() {
  console.log('🚀 Email Template System Examples\n');
  
  await exampleEmailVerificationFlow();
  await exampleTemplateRendering();
  await exampleEmailServiceConfiguration();
  
  console.log('\n✨ Examples completed! Check your email provider for test messages.');
}

// Export for use in other files
export { 
  runEmailExamples,
  exampleEmailVerificationFlow,
  exampleTemplateRendering,
  exampleEmailServiceConfiguration
};

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEmailExamples().catch(console.error);
}