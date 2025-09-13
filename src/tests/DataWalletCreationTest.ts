import { ethers } from 'ethers';
import { Config } from '../core/configuration';

/**
 * Complete DATA_WALLET Creation Test
 * Tests the full email → IPFS → authorization → user approval → wallet creation flow
 */
class DataWalletCreationTest {
  private provider!: ethers.providers.JsonRpcProvider;
  private serviceWallet!: ethers.Wallet;
  private userWallet!: ethers.Wallet;
  private authContract!: ethers.Contract;
  private config: Config;
  
  constructor() {
    this.config = new Config();
    this.config.loadDomain('localhost');
    this.initializeWallets();
  }
  
  private initializeWallets() {
    const rpcUrl = this.config.get('blockchain.rpcUrl', 'https://rpc-amoy.polygon.technology/');
    const servicePrivateKey = this.config.get('blockchain.serviceWalletPrivateKey');
    const contractAddress = this.config.get('blockchain.contractAuthorization');
    
    if (!servicePrivateKey) {
      throw new Error('Service wallet private key not found in configuration');
    }
    
    if (!contractAddress) {
      throw new Error('Contract authorization address not found in configuration');
    }
    
    // Initialize provider
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Service wallet (for contract operations)
    this.serviceWallet = new ethers.Wallet(servicePrivateKey, this.provider);
    
    // Test user wallet (for MetaMask simulation)
    this.userWallet = new ethers.Wallet('0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a', this.provider);
    console.log(`👤 Test User Wallet: ${this.userWallet.address}`);
    
    // Contract ABI (expanded for testing)
    const authABI = [
      "function getAuthorizationRequest(bytes32 requestId) external view returns (address userWallet, string authToken, bytes32 emailHash, uint256 attachmentCount, uint256 creditCost, uint256 createdAt, uint256 expiresAt, uint8 status)",
      "function authorizeEmailWalletCreation(bytes32 requestId, bytes signature) external",
      "function processAuthorizedRequest(bytes32 requestId, tuple(string forwardedBy, string originalSender, string messageId, string subject, bytes32 bodyHash, bytes32 emailHash, bytes32 emailHeadersHash, uint256 attachmentCount, string ipfsHash, tuple(bool spfPass, bool dkimValid, bool dmarcPass, string dkimSignature) authResults) emailData, tuple(string originalFilename, string filename, string mimeType, string fileExtension, uint256 fileSize, bytes32 contentHash, string fileSignature, string ipfsHash, uint256 attachmentIndex, string emailSender, string emailSubject, uint256 emailTimestamp)[] attachmentData) external returns (tuple(bool success, bytes32 emailWalletId, bytes32[] attachmentWalletIds, uint256 totalCreditsUsed, string errorMessage))"
    ];
    
    this.authContract = new ethers.Contract(contractAddress, authABI, this.serviceWallet);
    
    console.log('🔧 Wallets initialized:');
    console.log(`   Service Wallet: ${this.serviceWallet.address}`);
    console.log(`   User Wallet: ${this.userWallet.address}`);
    console.log(`   Contract: ${contractAddress}`);
  }
  
  /**
   * Test the complete DATA_WALLET creation flow
   */
  async testCompleteFlow() {
    console.log('\n🚀 Testing Complete DATA_WALLET Creation Flow');
    console.log('=' .repeat(60));
    
    try {
      // Use the existing authorization request from your test
      const existingRequestId = '0xca2dbc2e59f35556d80d821d3c29a949ee1f4e9f15eb193e5fcf46143d92ac62';
      
      console.log(`📋 Step 1: Verify existing authorization request`);
      console.log(`   Request ID: ${existingRequestId}`);
      
      // Get request details
      const requestDetails = await this.getRequestDetails(existingRequestId);
      if (!requestDetails) {
        console.log('❌ Request not found. Creating new request...');
        await this.createNewRequest();
        return;
      }
      
      console.log(`✅ Request found and valid`);
      console.log(`   User: ${requestDetails.userWallet}`);
      console.log(`   Status: ${this.getStatusName(requestDetails.status)}`);
      console.log(`   Credit Cost: ${requestDetails.creditCost}`);
      console.log(`   Expires: ${new Date(requestDetails.expiresAt * 1000).toISOString()}`);
      
      if (requestDetails.status !== 0) {
        console.log(`⚠️  Request status is ${this.getStatusName(requestDetails.status)}, not pending`);
        console.log('   Creating new request for testing...');
        await this.createNewRequest();
        return;
      }
      
      // Step 2: Simulate user MetaMask signature
      console.log(`\n👤 Step 2: Simulate user MetaMask authorization`);
      const userSignature = await this.simulateUserSignature(existingRequestId);
      
      // Step 3: Submit user authorization
      console.log(`\n🔐 Step 3: Submit user authorization to blockchain`);
      await this.submitUserAuthorization(existingRequestId, userSignature);
      
      // Step 4: Process the authorized request (create DATA_WALLET)
      console.log(`\n⛓️  Step 4: Process authorized request (create DATA_WALLET)`);
      await this.processAuthorizedRequest(existingRequestId);
      
      console.log(`\n🎉 DATA_WALLET Creation Test Complete!`);
      
    } catch (error: any) {
      console.error(`❌ Test failed:`, error);
    }
  }
  
  /**
   * Get authorization request details
   */
  private async getRequestDetails(requestId: string) {
    try {
      const result = await this.authContract.getAuthorizationRequest(requestId);
      
      return {
        userWallet: result.userWallet,
        authToken: result.authToken,
        emailHash: result.emailHash,
        attachmentCount: result.attachmentCount.toNumber(),
        creditCost: result.creditCost.toNumber(),
        createdAt: result.createdAt.toNumber(),
        expiresAt: result.expiresAt.toNumber(),
        status: result.status
      };
      
    } catch (error) {
      console.log(`   Request not found or error: ${error}`);
      return null;
    }
  }
  
  /**
   * Simulate user MetaMask signature
   */
  private async simulateUserSignature(requestId: string): Promise<string> {
    console.log(`   Simulating MetaMask signature for request: ${requestId}`);
    
    // Create the message that user would sign in MetaMask
    // This should match exactly what the smart contract expects
    const messageHash = ethers.utils.keccak256(
      ethers.utils.solidityPack(['bytes32'], [requestId])
    );
    
    // Sign with user wallet (simulates MetaMask)
    const signature = await this.userWallet.signMessage(ethers.utils.arrayify(messageHash));
    
    console.log(`   ✅ User signature created: ${signature.substring(0, 20)}...`);
    console.log(`   Message Hash: ${messageHash}`);
    
    return signature;
  }
  
  /**
   * Submit user authorization to blockchain
   */
  private async submitUserAuthorization(requestId: string, signature: string) {
    try {
      console.log(`   Submitting user authorization transaction...`);
      
      // Connect contract with user wallet for authorization
      const userAuthContract = this.authContract.connect(this.userWallet);
      
      const tx = await userAuthContract.authorizeEmailWalletCreation(
        requestId,
        signature,
        {
          gasLimit: 300000,
          gasPrice: ethers.utils.parseUnits('30', 'gwei')
        }
      );
      
      console.log(`   ⏳ Transaction submitted: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Authorization confirmed in block ${receipt.blockNumber}`);
      
      // Verify status changed to authorized
      const updatedRequest = await this.getRequestDetails(requestId);
      if (updatedRequest) {
        console.log(`   Status updated to: ${this.getStatusName(updatedRequest.status)}`);
      }
      
    } catch (error: any) {
      console.error(`   ❌ Authorization failed:`, error);
      throw error;
    }
  }
  
  /**
   * Process authorized request to create DATA_WALLET
   */
  private async processAuthorizedRequest(requestId: string) {
    try {
      console.log(`   Processing authorized request to create DATA_WALLET...`);
      
      // Prepare email data for wallet creation
      const emailData = {
        forwardedBy: 'rootz.global',
        originalSender: 'wallet-creation-test@example.com',
        messageId: 'generated.1757797200000.7b33b4de@rootz.global',
        subject: 'Complete DATA_WALLET Creation Test',
        bodyHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('071e9d4aba939be713a41dc754c17659034bd9022812a7dda724b53507588901')),
        emailHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('9d95ab146272cae8d08b42804b8fbdd8889819ee93c76ab14fa090942d801d0f')),
        emailHeadersHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('5990e6022950898866205a6d768b43ace80fe7a2e0d23d4af37b0b0978a7add2')),
        attachmentCount: 0,
        ipfsHash: 'QmcYpsKJechgFb8Evd9DKZhLrfs1b4YPv75QSxjs1tJZu5',
        authResults: {
          spfPass: false,
          dkimValid: false,
          dmarcPass: false,
          dkimSignature: ''
        }
      };
      
      // No attachments for this test
      const attachmentData: any[] = [];
      
      console.log(`   Calling processAuthorizedRequest...`);
      
      const tx = await this.authContract.processAuthorizedRequest(
        requestId,
        emailData,
        attachmentData,
        {
          gasLimit: 1000000,
          gasPrice: ethers.utils.parseUnits('30', 'gwei')
        }
      );
      
      console.log(`   ⏳ Processing transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ DATA_WALLET created in block ${receipt.blockNumber}`);
      console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
      
      // Look for wallet creation events in logs
      console.log(`   📊 Transaction logs: ${receipt.logs.length} events`);
      
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === this.authContract.address.toLowerCase()) {
          console.log(`   📝 Contract Event:`, {
            topics: log.topics.length,
            data: log.data.substring(0, 50) + '...'
          });
        }
      }
      
      // Verify final status
      const finalRequest = await this.getRequestDetails(requestId);
      if (finalRequest) {
        console.log(`   Final Status: ${this.getStatusName(finalRequest.status)}`);
      }
      
    } catch (error: any) {
      console.error(`   ❌ Processing failed:`, error);
      throw error;
    }
  }
  
  /**
   * Create a new request for testing
   */
  private async createNewRequest() {
    console.log(`\n📝 Creating new authorization request for testing...`);
    // This would call the email processing endpoint to create a new request
    console.log(`   Use the email processing API to create a new request first`);
  }
  
  /**
   * Convert status number to readable name
   */
  private getStatusName(status: number): string {
    const statusMap = {
      0: 'Pending',
      1: 'Authorized', 
      2: 'Processed',
      3: 'Expired',
      4: 'Cancelled'
    };
    return statusMap[status as keyof typeof statusMap] || `Unknown(${status})`;
  }
}

/**
 * Run the test
 */
async function runTest() {
  const test = new DataWalletCreationTest();
  await test.testCompleteFlow();
}

// Export for use
export { DataWalletCreationTest, runTest };

// Run if called directly
if (require.main === module) {
  runTest().catch(console.error);
}
