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
  authorizationTx?: string;
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
  private provider!: ethers.providers.JsonRpcProvider;
  private serviceWallet!: ethers.Wallet;
  private emailDataWalletContract!: ethers.Contract;
  private registrationContract!: ethers.Contract;
  private config: Config;
  
  // In-memory storage for authorization requests (replace with database in production)
  private authorizationRequests: Map<string, AuthorizationRequest> = new Map();
  private tokenToRequestId: Map<string, string> = new Map();
  
  constructor(config: Config) {
    this.config = config;
    this.initializeBlockchain();
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
      const authRequest: AuthorizationRequest = {\n        requestId,\n        userAddress,\n        authToken,\n        emailHash: emailData.emailHash,\n        attachmentHashes: emailData.attachments.map(att => att.contentHash),\n        creditCost: requiredCredits,\n        createdAt: new Date(),\n        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours\n        status: 'pending',\n        emailSender: emailData.from,\n        emailSubject: emailData.subject,\n        attachmentCount: emailData.attachments.length,\n        ipfsHash,\n        emailData\n      };\n      \n      // Store in memory (would be database in production)\n      this.authorizationRequests.set(requestId, authRequest);\n      this.tokenToRequestId.set(authToken, requestId);\n      \n      console.log(`✅ Enhanced authorization request created:`);\n      console.log(`   Request ID: ${requestId}`);\n      console.log(`   Auth Token: ${authToken}`);\n      \n      return {\n        success: true,\n        requestId,\n        authToken\n      };\n      \n    } catch (error: any) {\n      console.error('❌ Failed to create enhanced authorization request:', error);\n      return {\n        success: false,\n        error: error?.message || 'Failed to create authorization request'\n      };\n    }\n  }\n  \n  /**\n   * ENHANCED USER AUTHORIZATION - Direct wallet creation with signature verification\n   * This is the missing piece that solves the owner vs user problem!\n   */\n  async authorizeEmailWalletCreation(\n    requestId: string,\n    userAddress: string,\n    signature: string\n  ): Promise<AuthorizationResult> {\n    \n    try {\n      console.log('🔐 Processing enhanced user authorization...');\n      console.log(`   Request ID: ${requestId}`);\n      console.log(`   User Address: ${userAddress}`);\n      \n      // Get authorization request\n      const request = this.authorizationRequests.get(requestId);\n      if (!request) {\n        throw new Error('Authorization request not found');\n      }\n      \n      if (request.userAddress.toLowerCase() !== userAddress.toLowerCase()) {\n        throw new Error('Request belongs to different user');\n      }\n      \n      if (request.status !== 'pending') {\n        throw new Error(`Request status is ${request.status}, cannot authorize`);\n      }\n      \n      if (new Date() > request.expiresAt) {\n        request.status = 'expired';\n        throw new Error('Authorization request has expired');\n      }\n      \n      // Verify signature (user proving consent)\n      const messageHash = ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32'], [requestId]));\n      const expectedAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(messageHash), signature);\n      \n      if (expectedAddress.toLowerCase() !== userAddress.toLowerCase()) {\n        throw new Error('Invalid signature - signature does not match user address');\n      }\n      \n      console.log('✅ Signature verified - user consent proven');\n      \n      // ENHANCED FEATURE: Service creates EMAIL_DATA_WALLET directly\n      console.log('🔧 Creating EMAIL_DATA_WALLET using enhanced contract...');\n      \n      if (!request.emailData) {\n        throw new Error('Email data not found in request');\n      }\n      \n      // Deduct credits first\n      console.log(`💰 Deducting ${request.creditCost} credits from user...`);\n      const deductTx = await this.registrationContract.deductCredits(\n        userAddress,\n        request.creditCost,\n        {\n          gasLimit: 200000,\n          gasPrice: ethers.utils.parseUnits('30', 'gwei')\n        }\n      );\n      await deductTx.wait();\n      console.log(`✅ Credits deducted: ${deductTx.hash}`);\n      \n      // Create content hash\n      const contentHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(request.emailData.emailHash));\n      \n      // Create EMAIL_DATA_WALLET on new enhanced contract\n      const createTx = await this.emailDataWalletContract.createEmailDataWallet(\n        userAddress,\n        request.emailData.subject,\n        request.emailData.from,\n        contentHash,\n        request.ipfsHash || '',\n        {\n          gasLimit: 300000,\n          gasPrice: ethers.utils.parseUnits('30', 'gwei')\n        }\n      );\n      \n      console.log(`⏳ EMAIL_DATA_WALLET creation transaction: ${createTx.hash}`);\n      \n      const receipt = await createTx.wait();\n      console.log(`✅ EMAIL_DATA_WALLET created in block ${receipt.blockNumber}`);\n      \n      // Extract wallet ID from transaction logs\n      const walletId = this.extractWalletIdFromReceipt(receipt);\n      \n      // Update request status\n      request.status = 'processed';\n      \n      console.log(`🎉 EMAIL_DATA_WALLET creation complete:`);\n      console.log(`   Wallet ID: ${walletId}`);\n      console.log(`   Transaction: ${createTx.hash}`);\n      \n      return {\n        success: true,\n        requestId,\n        emailWalletId: walletId,\n        authorizationTx: createTx.hash\n      };\n      \n    } catch (error: any) {\n      console.error('❌ Enhanced authorization failed:', error);\n      return {\n        success: false,\n        error: error?.message || 'Enhanced authorization failed'\n      };\n    }\n  }\n  \n  /**\n   * Get authorization request details\n   */\n  async getAuthorizationRequest(requestId: string): Promise<AuthorizationRequest | null> {\n    return this.authorizationRequests.get(requestId) || null;\n  }\n  \n  /**\n   * Get authorization request by auth token\n   */\n  async getAuthorizationRequestByToken(authToken: string): Promise<AuthorizationRequest | null> {\n    const requestId = this.tokenToRequestId.get(authToken);\n    if (!requestId) {\n      return null;\n    }\n    return this.getAuthorizationRequest(requestId);\n  }\n  \n  /**\n   * Get user's EMAIL_DATA_WALLETs from enhanced contract\n   */\n  async getUserEmailWallets(userAddress: string): Promise<string[]> {\n    try {\n      const wallets = await this.emailDataWalletContract.getAllUserWallets(userAddress);\n      console.log(`📧 User ${userAddress} has ${wallets.length} email wallets`);\n      return wallets;\n    } catch (error) {\n      console.error('❌ Error getting user email wallets:', error);\n      return [];\n    }\n  }\n  \n  /**\n   * Get EMAIL_DATA_WALLET details\n   */\n  async getEmailWalletDetails(walletId: string): Promise<any> {\n    try {\n      const wallet = await this.emailDataWalletContract.getEmailDataWallet(walletId);\n      \n      return {\n        walletId,\n        owner: wallet.owner,\n        subject: wallet.subject,\n        sender: wallet.sender,\n        timestamp: wallet.timestamp.toNumber(),\n        isActive: wallet.isActive,\n        contentHash: wallet.contentHash,\n        ipfsHash: wallet.ipfsHash\n      };\n    } catch (error) {\n      console.error('❌ Error getting email wallet details:', error);\n      return null;\n    }\n  }\n  \n  /**\n   * Cancel authorization request\n   */\n  async cancelRequest(requestId: string): Promise<AuthorizationResult> {\n    try {\n      const request = this.authorizationRequests.get(requestId);\n      if (!request) {\n        throw new Error('Request not found');\n      }\n      \n      if (request.status !== 'pending') {\n        throw new Error(`Cannot cancel request with status: ${request.status}`);\n      }\n      \n      request.status = 'cancelled';\n      \n      console.log(`🚫 Request cancelled: ${requestId}`);\n      \n      return {\n        success: true,\n        requestId\n      };\n      \n    } catch (error: any) {\n      console.error('❌ Failed to cancel request:', error);\n      return {\n        success: false,\n        error: error?.message || 'Failed to cancel request'\n      };\n    }\n  }\n  \n  /**\n   * Extract wallet ID from transaction receipt\n   */\n  private extractWalletIdFromReceipt(receipt: ethers.providers.TransactionReceipt): string | null {\n    try {\n      for (const log of receipt.logs) {\n        if (log.address.toLowerCase() === this.emailDataWalletContract.address.toLowerCase()) {\n          // The wallet ID should be in the first topic (after event signature)\n          if (log.topics.length >= 2) {\n            return log.topics[1];\n          }\n        }\n      }\n      return null;\n    } catch (error) {\n      console.error('Failed to extract wallet ID from receipt:', error);\n      return null;\n    }\n  }\n  \n  /**\n   * Health check for enhanced authorization service\n   */\n  async healthCheck(): Promise<{ healthy: boolean; details: any }> {\n    try {\n      const balance = await this.provider.getBalance(this.serviceWallet.address);\n      const balanceInEth = ethers.utils.formatEther(balance);\n      const blockNumber = await this.provider.getBlockNumber();\n      \n      return {\n        healthy: parseFloat(balanceInEth) > 0.01,\n        details: {\n          serviceWallet: this.serviceWallet.address,\n          balance: `${balanceInEth} POL`,\n          blockNumber,\n          emailDataWalletContract: this.emailDataWalletContract.address,\n          registrationContract: this.registrationContract.address,\n          pendingRequests: this.authorizationRequests.size,\n          enhanced: true\n        }\n      };\n      \n    } catch (error: any) {\n      return {\n        healthy: false,\n        details: { error: error?.message || 'Unknown error' }\n      };\n    }\n  }\n}\n\nexport default EnhancedAuthorizationService;