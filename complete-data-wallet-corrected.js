// Complete DATA_WALLET Creation Script - CORRECTED ARCHITECTURE
// Service wallet handles everything, user address is bound for ownership

const { ethers } = require('ethers');
const fs = require('fs');
const ini = require('ini');
const path = require('path');

async function completeDataWalletCreation() {
  console.log('\n🚀 Completing DATA_WALLET Creation - Corrected Architecture');
  console.log('=' .repeat(60));

  try {
    // Load configuration
    const configPath = path.join(process.env.HOME, '.data-wallet', 'localhost', 'config.ini');
    const config = ini.parse(fs.readFileSync(configPath, 'utf-8'));
    
    // Setup blockchain connection
    const provider = new ethers.providers.JsonRpcProvider('https://rpc-amoy.polygon.technology/');
    const serviceWallet = new ethers.Wallet(config.blockchain.serviceWalletPrivateKey, provider);
    
    console.log(`🏢 Service Wallet: ${serviceWallet.address}`);
    console.log(`👤 User Address (for binding): 0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b`);
    
    // Check service wallet balance
    const balance = await provider.getBalance(serviceWallet.address);
    console.log(`💰 Service Wallet Balance: ${ethers.utils.formatEther(balance)} POL`);
    
    // Contract setup
    const contractAddress = config.blockchain.contractAuthorization;
    const authABI = [
      "function getAuthorizationRequest(bytes32 requestId) external view returns (address userWallet, string authToken, bytes32 emailHash, uint256 attachmentCount, uint256 creditCost, uint256 createdAt, uint256 expiresAt, uint8 status)",
      "function authorizeEmailWalletCreation(bytes32 requestId, bytes signature) external",
      "function processAuthorizedRequest(bytes32 requestId, tuple(string forwardedBy, string originalSender, string messageId, string subject, bytes32 bodyHash, bytes32 emailHash, bytes32 emailHeadersHash, uint256 attachmentCount, string ipfsHash, tuple(bool spfPass, bool dkimValid, bool dmarcPass, string dkimSignature) authResults) emailData, tuple(string originalFilename, string filename, string mimeType, string fileExtension, uint256 fileSize, bytes32 contentHash, string fileSignature, string ipfsHash, uint256 attachmentIndex, string emailSender, string emailSubject, uint256 emailTimestamp)[] attachmentData) external"
    ];
    
    const authContract = new ethers.Contract(contractAddress, authABI, serviceWallet);
    
    // Use your actual request ID
    const requestId = '0xca2dbc2e59f35556d80d821d3c29a949ee1f4e9f15eb193e5fcf46143d92ac62';
    
    console.log(`\n📋 Step 1: Verifying authorization request`);
    console.log(`   Request ID: ${requestId}`);
    
    // Get request details
    const request = await authContract.getAuthorizationRequest(requestId);
    console.log(`   User Address: ${request.userWallet}`);
    console.log(`   Status: ${getStatusName(request.status)}`);
    console.log(`   Credit Cost: ${request.creditCost.toString()}`);
    console.log(`   Expires: ${new Date(request.expiresAt.toNumber() * 1000).toISOString()}`);
    
    if (request.status !== 0) {
      console.log(`❌ Request status is not pending: ${getStatusName(request.status)}`);
      return;
    }
    
    console.log(`\n🔐 Step 2: Service wallet authorizing request (simulating user consent)`);
    
    // Create signature as service (representing user consent)
    // In production, this would be a user MetaMask signature that the service processes
    const messageHash = ethers.utils.keccak256(
      ethers.utils.solidityPack(['bytes32'], [requestId])
    );
    
    // Service creates signature for authorization (in real system, user provides this)
    const signature = await serviceWallet.signMessage(ethers.utils.arrayify(messageHash));
    console.log(`   Signature: ${signature.substring(0, 20)}...`);
    console.log(`   Message Hash: ${messageHash}`);
    
    console.log(`\n⛓️  Step 3: Service wallet submitting authorization`);
    
    // Service wallet submits authorization (pays gas fees)
    const authTx = await authContract.authorizeEmailWalletCreation(
      requestId,
      signature,
      {
        gasLimit: 500000,
        gasPrice: ethers.utils.parseUnits('30', 'gwei')
      }
    );
    
    console.log(`   Transaction: ${authTx.hash}`);
    const authReceipt = await authTx.wait();
    console.log(`   ✅ Authorization confirmed in block ${authReceipt.blockNumber}`);
    
    // Verify status changed
    const updatedRequest = await authContract.getAuthorizationRequest(requestId);
    console.log(`   Status updated to: ${getStatusName(updatedRequest.status)}`);
    
    console.log(`\n📦 Step 4: Service wallet creating DATA_WALLET`);
    
    // Prepare email data for DATA_WALLET creation
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
    
    // No attachments
    const attachmentData = [];
    
    console.log(`   Calling processAuthorizedRequest...`);
    console.log(`   IPFS Hash: ${emailData.ipfsHash}`);
    console.log(`   User will own DATA_WALLET: ${request.userWallet}`);
    
    // Service wallet pays for and creates the DATA_WALLET
    const processTx = await authContract.processAuthorizedRequest(
      requestId,
      emailData,
      attachmentData,
      {
        gasLimit: 1000000,
        gasPrice: ethers.utils.parseUnits('30', 'gwei')
      }
    );
    
    console.log(`   Transaction: ${processTx.hash}`);
    const processReceipt = await processTx.wait();
    console.log(`   ✅ DATA_WALLET created in block ${processReceipt.blockNumber}`);
    console.log(`   Gas used: ${processReceipt.gasUsed.toString()}`);
    
    // Check final status
    const finalRequest = await authContract.getAuthorizationRequest(requestId);
    console.log(`   Final status: ${getStatusName(finalRequest.status)}`);
    
    // Show transaction logs
    console.log(`\n📊 Transaction Results:`);
    console.log(`   Authorization: https://amoy.polygonscan.com/tx/${authTx.hash}`);
    console.log(`   DATA_WALLET Creation: https://amoy.polygonscan.com/tx/${processTx.hash}`);
    console.log(`   IPFS Content: https://rootz.digital/ipfs/${emailData.ipfsHash}`);
    
    console.log(`\n🎉 DATA_WALLET CREATION COMPLETE!`);
    console.log(`   Architecture: Service wallet pays, user address owns`);
    console.log(`   Email content permanently stored on IPFS`);
    console.log(`   Blockchain verification recorded on Polygon`);
    console.log(`   User ${request.userWallet} now owns the DATA_WALLET`);
    console.log(`   Immutable email wallet created with cryptographic proof`);
    
    // Check remaining balance
    const finalBalance = await provider.getBalance(serviceWallet.address);
    console.log(`   Service wallet balance: ${ethers.utils.formatEther(finalBalance)} POL`);
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    if (error.message.includes('insufficient funds')) {
      console.log(`\n💡 Service wallet needs more POL for gas fees`);
    }
  }
}

function getStatusName(status) {
  const statusMap = {
    0: 'Pending',
    1: 'Authorized', 
    2: 'Processed',
    3: 'Expired',
    4: 'Cancelled'
  };
  return statusMap[status] || `Unknown(${status})`;
}

completeDataWalletCreation().catch(console.error);
