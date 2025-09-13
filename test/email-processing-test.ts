import EmailProcessingController from '../src/controllers/EmailProcessingController';
import { Config } from '@core/configuration';

// Sample raw email for testing
const SAMPLE_EMAIL = `From: demo@techcorp.com
To: user@rootz.global
Subject: Test Email for DATA_WALLET Creation
Date: Thu, 12 Sep 2025 10:30:00 -0400
Message-ID: <test.12345@techcorp.com>
Content-Type: text/plain; charset=UTF-8
Authentication-Results: mx.google.com;
       dkim=pass header.i=@techcorp.com header.s=default header.b=abc123;
       spf=pass (google.com: domain of demo@techcorp.com designates 192.168.1.100 as permitted sender) smtp.mailfrom=demo@techcorp.com;
       dmarc=pass (p=NONE sp=NONE dis=NONE) header.from=techcorp.com
Received-SPF: pass (google.com: domain of demo@techcorp.com designates 192.168.1.100 as permitted sender) client-ip=192.168.1.100;

This is a test email to verify the Email Processing + IPFS + Authorization workflow.

The email should be:
1. Parsed into structured data with authentication results
2. Uploaded to local IPFS node with all metadata
3. Authorization request created on blockchain
4. User notified to approve via MetaMask

Content includes:
- Email metadata and headers
- SPF/DKIM/DMARC authentication results
- Email body content for hashing
- Test of the complete pipeline

Best regards,
Demo User
TechCorp Demo Team`;

/**
 * Test the complete Email Processing workflow
 */
async function testEmailProcessingWorkflow() {
  console.log('🧪 Testing Complete Email Processing Workflow');
  console.log('================================================\n');

  try {
    // Initialize configuration
    const config = new Config();
    config.loadDomain('localhost'); // Load test configuration
    
    // Test user address (replace with actual registered user)
    const testUserAddress = '0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b';
    
    console.log('📋 Test Configuration:');
    console.log(`   User Address: ${testUserAddress}`);
    console.log(`   Email Size: ${SAMPLE_EMAIL.length} characters`);
    console.log(`   Local IPFS: ${config.get('IPFS_LOCAL_URL', 'http://localhost:5001')}`);
    console.log(`   Auth Contract: ${config.get('CONTRACT_AUTHORIZATION')}`);
    console.log('');

    // Initialize controller
    console.log('🚀 Initializing Email Processing Controller...');
    const controller = new EmailProcessingController(config);
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Controller initialized\n');

    // Test the complete workflow
    console.log('📧 Starting Email Processing Workflow...');
    console.log('=====================================\n');
    
    const result = await controller.processEmailInternal(
      testUserAddress, 
      SAMPLE_EMAIL, 
      true // notifyUser
    );
    
    if (result.success) {
      console.log('\n🎉 WORKFLOW COMPLETED SUCCESSFULLY!');
      console.log('===================================');
      console.log(`📝 Request ID: ${result.requestId}`);
      console.log(`🔑 Auth Token: ${result.authToken}`);
      console.log(`💾 IPFS Hash: ${result.ipfsHash}`);
      console.log(`🔗 Authorization URL: ${result.authorizationUrl}`);
      console.log('');
      console.log('📊 Email Summary:');
      console.log(result.emailSummary);
      
      // Show next steps
      console.log('\n📋 NEXT STEPS FOR USER:');
      console.log('1. User receives notification with authorization URL');
      console.log('2. User clicks URL and connects MetaMask');
      console.log('3. User signs authorization transaction');
      console.log('4. Blockchain creates EMAIL_WALLET with IPFS reference');
      console.log('5. User can view/share/verify email via blockchain');
      
      return result;
    } else {
      console.error('❌ WORKFLOW FAILED:');
      console.error(`   Error: ${result.error}`);
      return null;
    }
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    return null;
  }
}

/**
 * Test individual components
 */
async function testIndividualComponents() {
  console.log('\n🔧 Testing Individual Components');
  console.log('================================\n');
  
  try {
    const config = new Config();
    config.loadDomain('localhost');
    
    // Test 1: Email Parsing
    console.log('📝 Test 1: Email Parser');
    const EmailParser = require('../src/services/email-processing/EmailParser').default;
    const parser = new EmailParser();
    
    const emailData = await parser.parseEmail(SAMPLE_EMAIL);
    const validation = parser.validateEmailData(emailData);
    
    if (validation.valid) {
      console.log('✅ Email parsing successful');
      console.log(`   Subject: ${emailData.subject}`);
      console.log(`   From: ${emailData.from}`);
      console.log(`   Email Hash: ${emailData.emailHash}`);
      console.log(`   SPF Pass: ${emailData.authentication.spfPass}`);
      console.log(`   DKIM Valid: ${emailData.authentication.dkimValid}`);
    } else {
      console.log('❌ Email parsing failed:', validation.errors);
    }
    
    console.log('');
    
    // Test 2: IPFS Service  
    console.log('💾 Test 2: Local IPFS Service');
    const LocalIPFSService = require('../src/services/ipfs/LocalIPFSService').default;
    const ipfsService = new LocalIPFSService(config);
    
    try {
      await ipfsService.initialize();
      const health = await ipfsService.healthCheck();
      
      if (health.healthy) {
        console.log('✅ IPFS service healthy');
        console.log(`   Node ID: ${health.details.nodeId}`);
        console.log(`   Version: ${health.details.version}`);
      } else {
        console.log('❌ IPFS service unhealthy:', health.details.error);
      }
    } catch (error) {
      console.log('❌ IPFS initialization failed:', error.message);
    }
    
    console.log('');
    
    // Test 3: Authorization Service
    console.log('🔐 Test 3: Authorization Service');
    const AuthorizationService = require('../src/services/authorization/AuthorizationService').default;
    const authService = new AuthorizationService(config);
    
    try {
      const health = await authService.healthCheck();
      
      if (health.healthy) {
        console.log('✅ Authorization service healthy');
        console.log(`   Service Wallet: ${health.details.serviceWallet}`);
        console.log(`   Balance: ${health.details.balance}`);
        console.log(`   Block Number: ${health.details.blockNumber}`);
      } else {
        console.log('❌ Authorization service unhealthy:', health.details.error);
      }
    } catch (error) {
      console.log('❌ Authorization service failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Component testing failed:', error);
  }
}

/**
 * Test configuration loading
 */
function testConfiguration() {
  console.log('\n⚙️  Testing Configuration');
  console.log('=========================\n');
  
  try {
    const config = new Config();
    config.loadDomain('localhost');
    
    const requiredKeys = [
      'SERVICE_WALLET_PRIVATE_KEY',
      'CONTRACT_AUTHORIZATION',
      'RPC_URL',
      'IPFS_LOCAL_URL'
    ];
    
    console.log('📋 Configuration Check:');
    let allPresent = true;
    
    for (const key of requiredKeys) {
      const value = config.get(key);
      if (value) {
        console.log(`✅ ${key}: ${key.includes('PRIVATE_KEY') ? '[HIDDEN]' : value}`);
      } else {
        console.log(`❌ ${key}: MISSING`);
        allPresent = false;
      }
    }
    
    if (allPresent) {
      console.log('\n✅ All required configuration present');
    } else {
      console.log('\n❌ Missing required configuration keys');
      console.log('   Please update config/localhost/config.ini');
    }
    
  } catch (error) {
    console.error('❌ Configuration test failed:', error);
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('🎯 SKS Rootz Platform - Email Processing Test Suite');
  console.log('===================================================\n');
  
  // Test configuration first
  testConfiguration();
  
  // Test individual components
  await testIndividualComponents();
  
  // Test complete workflow
  const workflowResult = await testEmailProcessingWorkflow();
  
  console.log('\n📊 Test Summary');
  console.log('==============');
  
  if (workflowResult) {
    console.log('✅ Complete workflow: PASSED');
    console.log('🎉 Ready for production testing!');
    
    console.log('\n🚀 To test with real email:');
    console.log('curl -X POST http://localhost:3000/.rootz/email-processing/process \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -d \'{"userAddress":"0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b","rawEmail":"..."}\'');
    
  } else {
    console.log('❌ Complete workflow: FAILED');
    console.log('🔧 Check configuration and services');
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { testEmailProcessingWorkflow, testIndividualComponents, testConfiguration, runAllTests };
