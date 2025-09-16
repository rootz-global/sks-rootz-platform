import { ethers } from 'ethers';
import { Config } from '../../core/configuration';
import { ParsedEmailData } from '../email-processing/EmailParser';
import { DatabaseService } from '../database/DatabaseService';

export interface AuthorizationRequest {
  requestId: string;
  userAddress: string;
  authToken: string;
  emailHash: string;
  attachmentHashes: string[];
  creditCost: number;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'authorized' | 'processed' | 'expired' | 'cancelled';
  emailSender?: string;
  emailSubject?: string;
  attachmentCount?: number;
  ipfsHash?: string;
  emailData?: ParsedEmailData;
}

export interface AuthorizationResult {
  success: boolean;
  requestId?: string;
  authToken?: string;
  emailWalletId?: string;
  attachmentWalletIds?: string[];
  authorizationTx?: string;
  totalCreditsUsed?: number;
  error?: string;
}

/**
 * Enhanced Authorization Service with PostgreSQL Database
 * 
 * SOLVES: Authorization request persistence issues by using database storage
 * instead of problematic in-memory Maps that don't survive service restarts
 * or work correctly across multiple service instances.
 */
export class EnhancedAuthorizationService {
  private provider!: ethers.providers.JsonRpcProvider;
  private serviceWallet!: ethers.Wallet;
  private emailDataWalletContract!: ethers.Contract;
  private registrationContract!: ethers.Contract;
  private config!: Config;
  private database: DatabaseService;
  
  constructor(config: Config) {
    this.config = config;
    this.database = new DatabaseService(config);
    this.initializeBlockchain();
  }
  
  /**
   * Initialize database connection and blockchain
   */
  async initialize(): Promise<void> {
    try {
      console.log('📊 Initializing Enhanced Authorization Service with database...');
      
      // Initialize database first
      await this.database.initialize();
      
      // Clean up any expired requests
      await this.database.cleanupExpiredRequests();
      
      console.log('✅ Enhanced Authorization Service initialized with database persistence');
      
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Authorization Service:', error);
      throw error;
    }
  }
  
  /**
   * Initialize blockchain connection with AuthorizationManagerFixed as orchestrator
   */
  private initializeBlockchain(): void {
    try {
      const rpcUrl = this.config.get('blockchain.rpcUrl', 'https://rpc-amoy.polygon.technology/');
      const privateKey = this.config.get('blockchain.serviceWalletPrivateKey');
      const emailDataWalletContractAddress = ethers.utils.getAddress(
        this.config.get('blockchain.contractEmailDataWallet', '0x0eb8830FaC353A63E912861137b246CAC7FC5977')!.toLowerCase()
      );
      const registrationContractAddress = ethers.utils.getAddress(
        this.config.get('blockchain.contractRegistration')!.toLowerCase()
      );
      
      if (!privateKey) {
        throw new Error('blockchain.serviceWalletPrivateKey not configured');
      }
      
      if (!emailDataWalletContractAddress) {
        throw new Error('blockchain.contractEmailDataWallet not configured');
      }
      
      if (!registrationContractAddress) {
        throw new Error('blockchain.contractRegistration not configured');
      }
      
      // Initialize provider and wallet (ethers v5 syntax)
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      this.serviceWallet = new ethers.Wallet(privateKey, this.provider);
      
      // EmailDataWalletOS_Secure ABI - THE CORRECT DEPLOYED CONTRACT
      const emailDataWalletABI = [
        "function createEmailDataWallet(address userAddress, string emailHash, string subjectHash, string contentHash, string senderHash, string[] attachmentHashes, string metadata) returns (uint256)",
        "function getEmailDataWallet(uint256 walletId) view returns (tuple(uint256 walletId, address userAddress, string emailHash, string subjectHash, string contentHash, string senderHash, string[] attachmentHashes, uint32 attachmentCount, uint256 timestamp, bool isActive, string metadata))",
        "function getAllUserWallets(address userAddress) view returns (uint256[] memory)",
        "function getActiveWalletCount(address userAddress) view returns (uint256)",
        "function walletExists(uint256 walletId) view returns (bool)",
        "function getTotalWalletCount() view returns (uint256)",
        "function emailHashExists(string emailHash) view returns (bool)",
        "function owner() view returns (address)",
        "function paused() view returns (bool)"
      ];
      
      // Registration contract ABI
      const registrationABI = [
        "function isRegistered(address wallet) view returns (bool)",
        "function getCreditBalance(address wallet) view returns (uint256)",
        "function deductCredits(address wallet, uint256 amount) returns (bool)",
        "function owner() view returns (address)"
      ];
      
      // CRITICAL: Use EmailDataWalletOS_Secure as the unified contract
      this.emailDataWalletContract = new ethers.Contract(
        emailDataWalletContractAddress,
        emailDataWalletABI,
        this.serviceWallet
      );
      
      this.registrationContract = new ethers.Contract(
        registrationContractAddress,
        registrationABI,
        this.serviceWallet
      );
      
      console.log('✅ Enhanced Authorization service initialized with UNIFIED CONTRACT pattern');
      console.log(`   Service Wallet: ${this.serviceWallet.address}`);
      console.log(`   🎯 EmailDataWallet Contract (UNIFIED): ${emailDataWalletContractAddress}`);
      console.log(`   📊 Registration Contract: ${registrationContractAddress}`);
      console.log(`   🔄 Using EmailDataWalletOS_Secure for direct wallet creation`);
      
    } catch (error) {
      console.error('❌ Failed to initialize enhanced authorization service:', error);
      throw error;
    }
  }
  
  /**
   * Create authorization request (stored in DATABASE, not memory)
   */
  async createAuthorizationRequest(
    userAddress: string,
    emailData: ParsedEmailData,
    ipfsHash: string
  ): Promise<AuthorizationResult> {
    
    try {
      console.log('📝 Creating enhanced authorization request...');
      console.log(`   User: ${userAddress}`);
      console.log(`   Email: ${emailData.subject} from ${emailData.from}`);
      console.log(`   IPFS: ${ipfsHash}`);
      
      // Verify user is registered
      const isRegistered = await this.registrationContract.isRegistered(userAddress);
      if (!isRegistered) {
        throw new Error('User not registered');
      }
      
      // Check credit balance
      const creditBalance = await this.registrationContract.getCreditBalance(userAddress);
      const requiredCredits = 3 + (emailData.attachments.length * 2) + 1; // Base + attachments + processing
      
      if (creditBalance.lt(requiredCredits)) {
        throw new Error(`Insufficient credits. Required: ${requiredCredits}, Available: ${creditBalance.toString()}`);
      }
      
      // Generate unique IDs
      const requestId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(
        `${userAddress}-${emailData.messageId}-${Date.now()}`
      ));
      const authToken = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(
        `${userAddress}-${Date.now()}`
      )).substring(0, 18);
      
      // Create authorization request object
      const authRequest: AuthorizationRequest = {
        requestId,
        userAddress,
        authToken,
        emailHash: emailData.emailHash,
        attachmentHashes: emailData.attachments.map(att => att.contentHash),
        creditCost: requiredCredits,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        status: 'pending',
        emailSender: emailData.from,
        emailSubject: emailData.subject,
        attachmentCount: emailData.attachments.length,
        ipfsHash,
        emailData
      };
      
      // Store in DATABASE (not memory)
      await this.database.createAuthorizationRequest(authRequest);
      
      console.log(`✅ Enhanced authorization request created:`);
      console.log(`   Request ID: ${requestId}`);
      console.log(`   Auth Token: ${authToken}`);
      console.log(`   📊 Stored in database (persistent)`);
      
      return {
        success: true,
        requestId,
        authToken
      };
      
    } catch (error: any) {
      console.error('❌ Failed to create enhanced authorization request:', error);
      return {
        success: false,
        error: error?.message || 'Failed to create authorization request'
      };
    }
  }
  
  /**
   * UNIFIED CONTRACT: Create wallet directly using EmailDataWalletOS_Secure
   */
  async authorizeEmailWalletCreation(
    requestId: string,
    userAddress: string,
    signature: string
  ): Promise<AuthorizationResult> {
    
    try {
      console.log('🔐 Processing authorization through UNIFIED CONTRACT...');
      console.log(`   Request ID: ${requestId}`);
      console.log(`   User Address: ${userAddress}`);
      
      // Get authorization request from DATABASE
      const request = await this.database.getAuthorizationRequest(requestId);
      if (!request) {
        throw new Error('Authorization request not found');
      }
      
      if (request.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Request belongs to different user');
      }
      
      if (request.status !== 'pending') {
        throw new Error(`Request status is ${request.status}, cannot authorize`);
      }
      
      if (new Date() > request.expiresAt) {
        await this.database.updateRequestStatus(requestId, 'expired');
        throw new Error('Authorization request has expired');
      }
      
      // Verify signature (user proving consent)
      const expectedAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(requestId), signature);
      
      if (expectedAddress.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Invalid signature - signature does not match user address');
      }
      
      console.log('✅ Signature verified - user consent proven');
      
      if (!request.emailData) {
        throw new Error('Email data not found in request');
      }
      
      // VALIDATION 1: Check contract owner (CRITICAL)
      const contractOwner = await this.emailDataWalletContract.owner();
      if (contractOwner.toLowerCase() !== this.serviceWallet.address.toLowerCase()) {
        throw new Error(`Service wallet ${this.serviceWallet.address} is not contract owner. Owner: ${contractOwner}`);
      }
      
      // VALIDATION 2: Check contract pause state
      const isPaused = await this.emailDataWalletContract.paused();
      if (isPaused) {
        throw new Error('Contract is paused - cannot create wallets');
      }
      
      // VALIDATION 3: Check user wallet count limit
      const userWalletCount = await this.emailDataWalletContract.getActiveWalletCount(userAddress);
      if (userWalletCount.gte(1000)) {
        throw new Error(`User has reached maximum wallet limit: ${userWalletCount.toString()}/1000`);
      }
      
      console.log('🎯 Calling EmailDataWalletOS_Secure.createEmailDataWallet()...');
      console.log(`   Contract Owner: ${contractOwner} ✅`);
      console.log(`   Contract Paused: ${isPaused} ✅`);
      console.log(`   User Wallet Count: ${userWalletCount.toString()}/1000 ✅`);
      
      // Deduct credits first
      console.log(`💰 Deducting ${request.creditCost} credits from user...`);
      const deductTx = await this.registrationContract.deductCredits(
        userAddress,
        request.creditCost,
        {
          gasLimit: 200000,
          gasPrice: ethers.utils.parseUnits('30', 'gwei')
        }
      );
      await deductTx.wait();
      console.log(`✅ Credits deducted: ${deductTx.hash}`);
      
      // PREPARE VALIDATED PARAMETERS
      
      // PARAM 1: userAddress (already validated above)
      const validatedUserAddress = ethers.utils.getAddress(userAddress);
      
      // PARAM 2: emailHash - MUST BE UNIQUE and under 500 chars
      const uniqueEmailHash = `email-${requestId.substring(2, 10)}-${Date.now()}`.substring(0, 60);
      
      // Check if this emailHash already exists
      const emailHashExists = await this.emailDataWalletContract.emailHashExists(uniqueEmailHash);
      if (emailHashExists) {
        throw new Error(`Email hash collision detected: ${uniqueEmailHash}`);
      }
      
      // PARAM 3: subjectHash - Non-empty, under 500 chars
      const subjectHash = (request.emailData.subject || 'No-Subject-Provided').substring(0, 400);
      
      // PARAM 4: contentHash - Use actual body hash, ensure under 500 chars
      const contentHash = request.emailData.bodyHash?.substring(0, 64) || 
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(
          request.emailData.bodyText || request.emailData.bodyHtml || 'empty-content'
        ));
      
      // PARAM 5: senderHash - Non-empty, under 500 chars  
      const senderHash = (request.emailData.from || 'unknown-sender').substring(0, 400);
      
      // PARAM 6: attachmentHashes - Validate each hash is non-empty and under 500 chars
      const validatedAttachmentHashes = (request.emailData.attachments || [])
        .map(att => att.contentHash || ethers.utils.keccak256(ethers.utils.toUtf8Bytes(att.filename || 'empty')))
        .filter(hash => hash && hash.length > 0)
        .map(hash => hash.substring(0, 64)) // Ensure under 500 chars
        .slice(0, 100); // MAX_ATTACHMENT_COUNT = 100
      
      // PARAM 7: metadata - Non-empty, under 500 chars, valid JSON structure
      const metadata = JSON.stringify({
        ipfsHash: request.ipfsHash || 'no-ipfs',
        timestamp: Date.now(),
        requestId: requestId.substring(0, 20),
        emailAuthentication: {
          spfPass: request.emailData.authentication?.spfPass || false,
          dkimValid: request.emailData.authentication?.dkimValid || false,
          dmarcPass: request.emailData.authentication?.dmarcPass || false
        }
      }).substring(0, 450); // Leave room for safety
      
      console.log('📋 VALIDATED PARAMETERS:');
      console.log(`   User Address: ${validatedUserAddress}`);
      console.log(`   Email Hash: ${uniqueEmailHash} (${uniqueEmailHash.length} chars)`);
      console.log(`   Subject Hash: ${subjectHash} (${subjectHash.length} chars)`);
      console.log(`   Content Hash: ${contentHash} (${contentHash.length} chars)`);
      console.log(`   Sender Hash: ${senderHash} (${senderHash.length} chars)`);
      console.log(`   Attachment Hashes: ${validatedAttachmentHashes.length} items`);
      console.log(`   Metadata: ${metadata.length} chars`);
      
      // FINAL CONTRACT CALL WITH VALIDATED PARAMETERS
      const createTx = await this.emailDataWalletContract.createEmailDataWallet(
        validatedUserAddress,        // address userAddress
        uniqueEmailHash,             // string emailHash (UNIQUE)
        subjectHash,                 // string subjectHash (NON-EMPTY, <500)
        contentHash,                 // string contentHash (NON-EMPTY, <500)  
        senderHash,                  // string senderHash (NON-EMPTY, <500)
        validatedAttachmentHashes,   // string[] attachmentHashes (ALL NON-EMPTY, <500)
        metadata,                    // string metadata (NON-EMPTY, <500)
        {
          gasLimit: 500000,
          gasPrice: ethers.utils.parseUnits('30', 'gwei')
        }
      );
      
      console.log(`⏳ EMAIL_DATA_WALLET creation transaction: ${createTx.hash}`);
      
      const receipt = await createTx.wait();
      console.log(`✅ EMAIL_DATA_WALLET created in block ${receipt.blockNumber}`);
      
      // Extract wallet ID from events
      const walletId = this.extractWalletIdFromReceipt(receipt);
      
      // Update request status in DATABASE
      await this.database.updateRequestStatus(requestId, 'processed');
      
      console.log(`🎉 Complete EMAIL_DATA_WALLET created via unified contract:`);
      console.log(`   Wallet ID: ${walletId}`);
      console.log(`   Transaction: ${createTx.hash}`);
      console.log(`   Credits Deducted: ${request.creditCost}`);
      console.log(`   Owner: ${userAddress}`);
      
      return {
        success: true,
        requestId,
        emailWalletId: walletId || undefined,
        attachmentWalletIds: [],
        authorizationTx: createTx.hash,
        totalCreditsUsed: request.creditCost
      };
      
    } catch (error: any) {
      console.error('❌ Unified contract wallet creation failed:', error);
      
      // Enhanced error reporting
      if (error.message?.includes('InvalidStringLength')) {
        console.error('   CAUSE: Parameter exceeds 500 character limit');
      } else if (error.message?.includes('InvalidHashValue')) {
        console.error('   CAUSE: Empty string parameter detected'); 
      } else if (error.message?.includes('EmailHashAlreadyExists')) {
        console.error('   CAUSE: Email hash collision - not unique');
      } else if (error.message?.includes('MaxWalletsExceeded')) {
        console.error('   CAUSE: User has reached 1000 wallet limit');
      } else if (error.message?.includes('Pausable: paused')) {
        console.error('   CAUSE: Contract is paused');
      } else if (error.message?.includes('Ownable: caller is not the owner')) {
        console.error('   CAUSE: Service wallet is not contract owner');
      }
      
      return {
        success: false,
        error: error?.message || 'Unified contract wallet creation failed'
      };
    }
  }
  
  /**
   * Get authorization request details from DATABASE
   */
  async getAuthorizationRequest(requestId: string): Promise<AuthorizationRequest | null> {
    try {
      return await this.database.getAuthorizationRequest(requestId);
    } catch (error) {
      console.error('❌ Error getting authorization request:', error);
      return null;
    }
  }
  
  /**
   * Get authorization request by auth token from DATABASE
   */
  async getAuthorizationRequestByToken(authToken: string): Promise<AuthorizationRequest | null> {
    try {
      return await this.database.getAuthorizationRequestByToken(authToken);
    } catch (error) {
      console.error('❌ Error getting authorization request by token:', error);
      return null;
    }
  }
  
  /**
   * Get user's authorization requests from DATABASE
   */
  async getUserRequests(userAddress: string): Promise<string[]> {
    try {
      const requests = await this.database.getUserRequests(userAddress);
      return requests.map(request => request.requestId);
    } catch (error) {
      console.error('❌ Error getting user requests:', error);
      return [];
    }
  }
  
  /**
   * Cancel authorization request in DATABASE
   */
  async cancelRequest(requestId: string): Promise<AuthorizationResult> {
    try {
      const request = await this.database.getAuthorizationRequest(requestId);
      if (!request) {
        throw new Error('Request not found');
      }
      
      if (request.status !== 'pending') {
        throw new Error(`Cannot cancel request with status: ${request.status}`);
      }
      
      await this.database.updateRequestStatus(requestId, 'cancelled');
      
      console.log(`🚫 Request cancelled: ${requestId}`);
      
      return {
        success: true,
        requestId
      };
      
    } catch (error: any) {
      console.error('❌ Failed to cancel request:', error);
      return {
        success: false,
        error: error?.message || 'Failed to cancel request'
      };
    }
  }
  
  /**
   * Check if authorization request is valid
   */
  async isRequestValid(requestId: string): Promise<boolean> {
    try {
      const request = await this.database.getAuthorizationRequest(requestId);
      if (!request) return false;
      
      if (request.status !== 'pending') return false;
      if (new Date() > request.expiresAt) {
        // Auto-expire the request
        await this.database.updateRequestStatus(requestId, 'expired');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking request validity:', error);
      return false;
    }
  }
  
  /**
   * Process authorized request (legacy compatibility)
   */
  async processAuthorizedRequest(
    requestId: string,
    emailData: ParsedEmailData,
    ipfsHash: string
  ): Promise<AuthorizationResult> {
    try {
      const request = await this.database.getAuthorizationRequest(requestId);
      if (!request) {
        throw new Error('Request not found');
      }
      
      if (request.status !== 'authorized') {
        throw new Error('Request not authorized');
      }
      
      // Create EMAIL_DATA_WALLET directly
      const contentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(emailData.emailHash));
      
      const createTx = await this.emailDataWalletContract.createEmailDataWallet(
        request.userAddress,
        emailData.subject,
        emailData.from,
        contentHash,
        ipfsHash,
        {
          gasLimit: 300000,
          gasPrice: ethers.utils.parseUnits('30', 'gwei')
        }
      );
      
      const receipt = await createTx.wait();
      const walletId = this.extractWalletIdFromReceipt(receipt);
      
      await this.database.updateRequestStatus(requestId, 'processed');
      
      return {
        success: true,
        requestId,
        emailWalletId: walletId || undefined,
        attachmentWalletIds: [],
        authorizationTx: createTx.hash,
        totalCreditsUsed: request.creditCost
      };
      
    } catch (error: any) {
      console.error('Error processing authorized request:', error);
      return {
        success: false,
        error: error?.message || 'Failed to process request'
      };
    }
  }
  
  /**
   * Health check for enhanced authorization service
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const balance = await this.provider.getBalance(this.serviceWallet.address);
      const balanceInEth = ethers.utils.formatEther(balance);
      const blockNumber = await this.provider.getBlockNumber();
      
      // Check database health
      const dbHealth = await this.database.healthCheck();
      const dbStats = await this.database.getStatistics();
      
      return {
        healthy: parseFloat(balanceInEth) > 0.01 && dbHealth.healthy,
        details: {
          serviceWallet: this.serviceWallet.address,
          balance: `${balanceInEth} POL`,
          blockNumber,
          authorizationContract: this.emailDataWalletContract.address,
          registrationContract: this.registrationContract.address,
          database: dbHealth.details,
          pendingRequests: dbStats.totalRequests,
          requestsByStatus: dbStats.byStatus,
          orchestrator: 'EmailDataWalletOS_Secure (Unified Contract)',
          orchestratorAddress: '0x0eb8830FaC353A63E912861137b246CAC7FC5977',
          architecture: 'Direct wallet creation via unified contract',
          persistent: true
        }
      };
      
    } catch (error: any) {
      return {
        healthy: false,
        details: { error: error?.message || 'Unknown error' }
      };
    }
  }
  
  /**
   * Extract wallet ID from transaction receipt
   */
  private extractWalletIdFromReceipt(receipt: ethers.providers.TransactionReceipt): string | null {
    try {
      // The deployed contract returns bytes32 walletId directly
      // Look for DataWalletCreated event or use the return value
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === this.emailDataWalletContract.address.toLowerCase()) {
          // For the deployed contract, wallet ID is bytes32, so return it directly
          if (log.topics.length >= 2) {
            return log.topics[1]; // bytes32 wallet ID
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to extract wallet ID from receipt:', error);
      return null;
    }
  }
  
  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.database.close();
  }
}

export default EnhancedAuthorizationService;