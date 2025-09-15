import { ethers } from 'ethers';
import { Config } from '../../core/configuration';
import { ParsedEmailData } from '../email-processing/EmailParser';

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
 * Enhanced Authorization Service - Uses new EmailDataWalletOS_Secure contract
 * 
 * This service solves the owner vs user authorization problem by:
 * 1. Creating authorization requests in memory (not on old contract)
 * 2. User provides signature proving consent
 * 3. Service creates EMAIL_DATA_WALLET directly using new enhanced contract
 * 4. Bypasses complex old authorization flow entirely
 */
export class EnhancedAuthorizationService {
  private static instance: EnhancedAuthorizationService | null = null;
  private provider!: ethers.providers.JsonRpcProvider;
  private serviceWallet!: ethers.Wallet;
  private emailDataWalletContract!: ethers.Contract;
  private registrationContract!: ethers.Contract;
  private config: Config;
  
  // SHARED in-memory storage for authorization requests (replace with database in production)
  private static authorizationRequests: Map<string, AuthorizationRequest> = new Map();
  private static tokenToRequestId: Map<string, string> = new Map();
  
  constructor(config: Config) {
    // Singleton pattern - return existing instance if available
    if (EnhancedAuthorizationService.instance) {
      return EnhancedAuthorizationService.instance;
    }
    
    this.config = config;
    this.initializeBlockchain();
    EnhancedAuthorizationService.instance = this;
  }
  
  /**
   * Initialize blockchain connection with NEW enhanced contracts
   */
  private initializeBlockchain(): void {
    try {
      const rpcUrl = this.config.get('blockchain.rpcUrl', 'https://rpc-amoy.polygon.technology/');
      const privateKey = this.config.get('blockchain.serviceWalletPrivateKey');
      const emailWalletContractAddress = this.config.get('blockchain.contractEmailDataWallet');
      const registrationContractAddress = this.config.get('blockchain.contractRegistration');
      
      if (!privateKey) {
        throw new Error('blockchain.serviceWalletPrivateKey not configured');
      }
      
      if (!emailWalletContractAddress) {
        throw new Error('blockchain.contractEmailDataWallet not configured');
      }
      
      if (!registrationContractAddress) {
        throw new Error('blockchain.contractRegistration not configured');
      }
      
      // Initialize provider and wallet (ethers v5 syntax)
      this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      this.serviceWallet = new ethers.Wallet(privateKey, this.provider);
      
      // NEW EmailDataWalletOS_Secure ABI (based on your deployment)
      const emailDataWalletABI = [
        "function createEmailDataWallet(address owner, string subject, string sender, bytes32 contentHash, string ipfsHash) returns (bytes32 walletId)",
        "function getEmailDataWallet(bytes32 walletId) view returns (tuple(address owner, string subject, string sender, uint256 timestamp, bool isActive, bytes32 contentHash, string ipfsHash))",
        "function getAllUserWallets(address user) view returns (bytes32[] memory)",
        "function getActiveWalletCount(address user) view returns (uint256)",
        "function getTotalWalletCount() view returns (uint256)",
        "function walletExists(bytes32 walletId) view returns (bool)",
        "function updateEmailDataWallet(bytes32 walletId, string newSubject, string newSender, bytes32 newContentHash, string newIpfsHash)",
        "function owner() view returns (address)"
      ];
      
      // Registration contract ABI
      const registrationABI = [
        "function isRegistered(address wallet) view returns (bool)",
        "function getCreditBalance(address wallet) view returns (uint256)",
        "function deductCredits(address wallet, uint256 amount) returns (bool)",
        "function owner() view returns (address)"
      ];
      
      this.emailDataWalletContract = new ethers.Contract(
        emailWalletContractAddress,
        emailDataWalletABI,
        this.serviceWallet
      );
      
      this.registrationContract = new ethers.Contract(
        registrationContractAddress,
        registrationABI,
        this.serviceWallet
      );
      
      console.log('✅ Enhanced Authorization service initialized');
      console.log(`   Service Wallet: ${this.serviceWallet.address}`);
      console.log(`   EmailDataWallet Contract: ${emailWalletContractAddress}`);
      console.log(`   Registration Contract: ${registrationContractAddress}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize enhanced authorization service:', error);
      throw error;
    }
  }
  
  /**
   * Create authorization request (stored in memory, not on old contract)
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
      
      // Store in SHARED memory (would be database in production)
      EnhancedAuthorizationService.authorizationRequests.set(requestId, authRequest);
      EnhancedAuthorizationService.tokenToRequestId.set(authToken, requestId);
      
      console.log(`✅ Enhanced authorization request created:`);
      console.log(`   Request ID: ${requestId}`);
      console.log(`   Auth Token: ${authToken}`);
      
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
   * ENHANCED USER AUTHORIZATION - Direct wallet creation with signature verification
   * This is the missing piece that solves the owner vs user problem!
   */
  async authorizeEmailWalletCreation(
    requestId: string,
    userAddress: string,
    signature: string
  ): Promise<AuthorizationResult> {
    
    try {
      console.log('🔐 Processing enhanced user authorization...');
      console.log(`   Request ID: ${requestId}`);
      console.log(`   User Address: ${userAddress}`);
      
      // Get authorization request from SHARED memory
      const request = EnhancedAuthorizationService.authorizationRequests.get(requestId);
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
        request.status = 'expired';
        throw new Error('Authorization request has expired');
      }
      
      // Verify signature (user proving consent)
      const messageHash = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32'], [requestId]));
      const expectedAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(messageHash), signature);
      
      if (expectedAddress.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Invalid signature - signature does not match user address');
      }
      
      console.log('✅ Signature verified - user consent proven');
      
      // ENHANCED FEATURE: Service creates EMAIL_DATA_WALLET directly
      console.log('🔧 Creating EMAIL_DATA_WALLET using enhanced contract...');
      
      if (!request.emailData) {
        throw new Error('Email data not found in request');
      }
      
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
      
      // Create content hash
      const contentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(request.emailData.emailHash));
      
      // Create EMAIL_DATA_WALLET on new enhanced contract
      const createTx = await this.emailDataWalletContract.createEmailDataWallet(
        userAddress,
        request.emailData.subject,
        request.emailData.from,
        contentHash,
        request.ipfsHash || '',
        {
          gasLimit: 300000,
          gasPrice: ethers.utils.parseUnits('30', 'gwei')
        }
      );
      
      console.log(`⏳ EMAIL_DATA_WALLET creation transaction: ${createTx.hash}`);
      
      const receipt = await createTx.wait();
      console.log(`✅ EMAIL_DATA_WALLET created in block ${receipt.blockNumber}`);
      
      // Extract wallet ID from transaction logs
      const walletId = this.extractWalletIdFromReceipt(receipt);
      
      // Update request status
      request.status = 'processed';
      
      console.log(`🎉 EMAIL_DATA_WALLET creation complete:`);
      console.log(`   Wallet ID: ${walletId}`);
      console.log(`   Transaction: ${createTx.hash}`);
      
      return {
        success: true,
        requestId,
        emailWalletId: walletId || undefined,
        attachmentWalletIds: [], // Enhanced contract handles email + attachments in one wallet
        authorizationTx: createTx.hash,
        totalCreditsUsed: request.creditCost
      };
      
    } catch (error: any) {
      console.error('❌ Enhanced authorization failed:', error);
      return {
        success: false,
        error: error?.message || 'Enhanced authorization failed'
      };
    }
  }
  
  /**
   * Get authorization request details
   */
  async getAuthorizationRequest(requestId: string): Promise<AuthorizationRequest | null> {
    return EnhancedAuthorizationService.authorizationRequests.get(requestId) || null;
  }
  
  /**
   * Get authorization request by auth token
   */
  async getAuthorizationRequestByToken(authToken: string): Promise<AuthorizationRequest | null> {
    const requestId = EnhancedAuthorizationService.tokenToRequestId.get(authToken);
    if (!requestId) {
      return null;
    }
    return this.getAuthorizationRequest(requestId);
  }
  
  /**
   * Get user's EMAIL_DATA_WALLETs from enhanced contract
   */
  async getUserEmailWallets(userAddress: string): Promise<string[]> {
    try {
      const wallets = await this.emailDataWalletContract.getAllUserWallets(userAddress);
      console.log(`📧 User ${userAddress} has ${wallets.length} email wallets`);
      return wallets;
    } catch (error) {
      console.error('❌ Error getting user email wallets:', error);
      return [];
    }
  }
  
  /**
   * Get EMAIL_DATA_WALLET details
   */
  async getEmailWalletDetails(walletId: string): Promise<any> {
    try {
      const wallet = await this.emailDataWalletContract.getEmailDataWallet(walletId);
      
      return {
        walletId,
        owner: wallet.owner,
        subject: wallet.subject,
        sender: wallet.sender,
        timestamp: wallet.timestamp.toNumber(),
        isActive: wallet.isActive,
        contentHash: wallet.contentHash,
        ipfsHash: wallet.ipfsHash
      };
    } catch (error) {
      console.error('❌ Error getting email wallet details:', error);
      return null;
    }
  }
  
  /**
   * Cancel authorization request
   */
  async cancelRequest(requestId: string): Promise<AuthorizationResult> {
    try {
      const request = EnhancedAuthorizationService.authorizationRequests.get(requestId);
      if (!request) {
        throw new Error('Request not found');
      }
      
      if (request.status !== 'pending') {
        throw new Error(`Cannot cancel request with status: ${request.status}`);
      }
      
      request.status = 'cancelled';
      
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
   * Extract wallet ID from transaction receipt
   */
  private extractWalletIdFromReceipt(receipt: ethers.providers.TransactionReceipt): string | null {
    try {
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === this.emailDataWalletContract.address.toLowerCase()) {
          // The wallet ID should be in the first topic (after event signature)
          if (log.topics.length >= 2) {
            return log.topics[1];
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
   * Check if authorization request is valid
   */
  async isRequestValid(requestId: string): Promise<boolean> {
    try {
      const request = EnhancedAuthorizationService.authorizationRequests.get(requestId);
      if (!request) return false;
      
      if (request.status !== 'pending') return false;
      if (new Date() > request.expiresAt) return false;
      
      return true;
    } catch (error) {
      console.error('Error checking request validity:', error);
      return false;
    }
  }
  
  /**
   * Get user's authorization requests
   */
  async getUserRequests(userAddress: string): Promise<string[]> {
    try {
      const userRequests: string[] = [];
      
      for (const [requestId, request] of EnhancedAuthorizationService.authorizationRequests.entries()) {
        if (request.userAddress.toLowerCase() === userAddress.toLowerCase()) {
          userRequests.push(requestId);
        }
      }
      
      return userRequests;
    } catch (error) {
      console.error('Error getting user requests:', error);
      return [];
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
      const request = EnhancedAuthorizationService.authorizationRequests.get(requestId);
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
      
      request.status = 'processed';
      
      return {
        success: true,
        requestId,
        emailWalletId: walletId || undefined,
        attachmentWalletIds: [], // Enhanced contract handles email + attachments in one wallet
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
      
      return {
        healthy: parseFloat(balanceInEth) > 0.01,
        details: {
          serviceWallet: this.serviceWallet.address,
          balance: `${balanceInEth} POL`,
          blockNumber,
          emailDataWalletContract: this.emailDataWalletContract.address,
          registrationContract: this.registrationContract.address,
          pendingRequests: EnhancedAuthorizationService.authorizationRequests.size,
          enhanced: true
        }
      };
      
    } catch (error: any) {
      return {
        healthy: false,
        details: { error: error?.message || 'Unknown error' }
      };
    }
  }
}

export default EnhancedAuthorizationService;