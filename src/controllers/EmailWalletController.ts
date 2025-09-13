import { Request, Response } from 'express';
import { Controller } from './Controller';
import { BlockchainService } from '../services/BlockchainService';
import { GraphEmailMonitorService } from '../services/GraphEmailMonitorService';

export class EmailWalletController extends Controller {
  private blockchainService: BlockchainService;
  private emailMonitorService: GraphEmailMonitorService;

  constructor(domain: string = 'localhost') {
    super();
    this.blockchainService = new BlockchainService(domain);
    this.emailMonitorService = new GraphEmailMonitorService(domain);
  }

  // User Registration
  public async register(req: Request, res: Response): Promise<void> {
    try {
      console.log('📝 [REGISTER] Processing user registration request');
      
      const { userAddress, signature, message } = req.body;
      
      if (!userAddress || !signature || !message) {
        this.sendError(res, 'Missing required fields: userAddress, signature, message', 400);
        return;
      }

      // Validate Ethereum address format
      const validAddress = this.blockchainService.validateAddress(userAddress);
      if (!validAddress) {
        this.sendError(res, 'Invalid Ethereum address format', 400);
        return;
      }

      console.log(`📝 [REGISTER] Validating address: ${userAddress} -> ${validAddress}`);

      // Check if user is already registered
      const isRegistered = await this.blockchainService.isUserRegistered(validAddress);
      if (isRegistered) {
        console.log(`⚠️ [REGISTER] User ${validAddress} is already registered`);
        this.sendError(res, 'User is already registered', 409);
        return;
      }

      // Register user with initial credits
      const initialCredits = 60; // Default credit allocation
      const registrationResult = await this.blockchainService.registerUser(
        validAddress,
        initialCredits,
        signature,
        message
      );

      console.log(`✅ [REGISTER] User ${validAddress} registered successfully`);
      
      this.sendResponse(res, {
        success: true,
        userAddress: validAddress,
        initialCredits,
        transactionHash: registrationResult.transactionHash,
        registrationId: registrationResult.registrationId,
        message: 'User registered successfully'
      });
      
    } catch (error) {
      console.error('❌ [REGISTER] Registration failed:', error);
      this.sendError(res, `Registration failed: ${error.message}`, 500);
    }
  }

  // Get User Credit Balance
  public async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      
      if (!address) {
        this.sendError(res, 'Address parameter is required', 400);
        return;
      }

      const validAddress = this.blockchainService.validateAddress(address);
      if (!validAddress) {
        this.sendError(res, 'Invalid Ethereum address format', 400);
        return;
      }

      console.log(`💰 [BALANCE] Checking balance for: ${validAddress}`);

      const isRegistered = await this.blockchainService.isUserRegistered(validAddress);
      if (!isRegistered) {
        this.sendError(res, 'User is not registered', 404);
        return;
      }

      const balance = await this.blockchainService.getUserCredits(validAddress);
      
      console.log(`💰 [BALANCE] User ${validAddress} has ${balance} credits`);
      
      this.sendResponse(res, {
        address: validAddress,
        credits: balance,
        isRegistered: true
      });
      
    } catch (error) {
      console.error('❌ [BALANCE] Balance check failed:', error);
      this.sendError(res, `Balance check failed: ${error.message}`, 500);
    }
  }

  // Email Monitoring Management
  public async startEmailMonitoring(req: Request, res: Response): Promise<void> {
    try {
      console.log('🚀 [EMAIL] Starting email monitoring service');
      
      await this.emailMonitorService.startMonitoring();
      
      this.sendResponse(res, {
        success: true,
        message: 'Email monitoring started successfully',
        status: this.emailMonitorService.getStatus()
      });
      
    } catch (error) {
      console.error('❌ [EMAIL] Failed to start email monitoring:', error);
      this.sendError(res, `Failed to start email monitoring: ${error.message}`, 500);
    }
  }

  public async stopEmailMonitoring(req: Request, res: Response): Promise<void> {
    try {
      console.log('🛑 [EMAIL] Stopping email monitoring service');
      
      this.emailMonitorService.stopMonitoring();
      
      this.sendResponse(res, {
        success: true,
        message: 'Email monitoring stopped successfully'
      });
      
    } catch (error) {
      console.error('❌ [EMAIL] Failed to stop email monitoring:', error);
      this.sendError(res, `Failed to stop email monitoring: ${error.message}`, 500);
    }
  }

  public async getEmailMonitoringStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = this.emailMonitorService.getStatus();
      
      this.sendResponse(res, {
        success: true,
        emailMonitoring: status
      });
      
    } catch (error) {
      console.error('❌ [EMAIL] Failed to get email monitoring status:', error);
      this.sendError(res, `Failed to get email monitoring status: ${error.message}`, 500);
    }
  }

  // Test Email Processing
  public async testEmailProcessing(req: Request, res: Response): Promise<void> {
    try {
      console.log('🧪 [EMAIL] Testing email processing');
      
      await this.emailMonitorService.testEmailProcessing();
      
      this.sendResponse(res, {
        success: true,
        message: 'Email processing test completed successfully'
      });
      
    } catch (error) {
      console.error('❌ [EMAIL] Email processing test failed:', error);
      this.sendError(res, `Email processing test failed: ${error.message}`, 500);
    }
  }

  // Wallet Creation Proposal Management
  public async createWalletProposal(req: Request, res: Response): Promise<void> {
    try {
      console.log('📧 [PROPOSAL] Creating wallet proposal');
      
      const { 
        userAddress, 
        emailSubject, 
        senderName, 
        senderAddress, 
        attachmentCount = 0 
      } = req.body;

      if (!userAddress || !emailSubject || !senderAddress) {
        this.sendError(res, 'Missing required fields: userAddress, emailSubject, senderAddress', 400);
        return;
      }

      const validAddress = this.blockchainService.validateAddress(userAddress);
      if (!validAddress) {
        this.sendError(res, 'Invalid Ethereum address format', 400);
        return;
      }

      // Check if user is registered
      const isRegistered = await this.blockchainService.isUserRegistered(validAddress);
      if (!isRegistered) {
        this.sendError(res, 'User is not registered', 404);
        return;
      }

      // Calculate credit cost
      const baseCost = 3; // Base email wallet cost
      const attachmentCost = attachmentCount * 2; // 2 credits per attachment
      const totalCost = baseCost + attachmentCost;

      // Check if user has sufficient credits
      const userCredits = await this.blockchainService.getUserCredits(validAddress);
      if (userCredits < totalCost) {
        this.sendError(res, `Insufficient credits. Required: ${totalCost}, Available: ${userCredits}`, 402);
        return;
      }

      // Create proposal ID
      const proposalId = `proposal-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      console.log(`📧 [PROPOSAL] Created proposal ${proposalId} for ${validAddress} (${totalCost} credits)`);

      this.sendResponse(res, {
        success: true,
        proposalId,
        userAddress: validAddress,
        emailSubject,
        senderName: senderName || 'Unknown',
        senderAddress,
        attachmentCount,
        creditCost: totalCost,
        userCredits,
        message: 'Wallet creation proposal created successfully'
      });
      
    } catch (error) {
      console.error('❌ [PROPOSAL] Proposal creation failed:', error);
      this.sendError(res, `Proposal creation failed: ${error.message}`, 500);
    }
  }

  // Wallet Authorization (Future Implementation)
  public async authorizeWallet(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔐 [AUTHORIZE] Processing wallet authorization');
      
      const { proposalId, userAddress, signature } = req.body;

      if (!proposalId || !userAddress || !signature) {
        this.sendError(res, 'Missing required fields: proposalId, userAddress, signature', 400);
        return;
      }

      // TODO: Implement wallet authorization logic
      // This will involve:
      // 1. Verify the proposal exists and is valid
      // 2. Verify the user signature
      // 3. Create the actual email wallet on blockchain
      // 4. Deduct credits from user account
      // 5. Store email data on IPFS
      
      this.sendResponse(res, {
        success: true,
        message: 'Wallet authorization endpoint - implementation pending',
        proposalId,
        userAddress
      });
      
    } catch (error) {
      console.error('❌ [AUTHORIZE] Authorization failed:', error);
      this.sendError(res, `Authorization failed: ${error.message}`, 500);
    }
  }

  // User Dashboard Data
  public async getUserDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      
      if (!address) {
        this.sendError(res, 'Address parameter is required', 400);
        return;
      }

      const validAddress = this.blockchainService.validateAddress(address);
      if (!validAddress) {
        this.sendError(res, 'Invalid Ethereum address format', 400);
        return;
      }

      console.log(`📊 [DASHBOARD] Loading dashboard for: ${validAddress}`);

      const isRegistered = await this.blockchainService.isUserRegistered(validAddress);
      if (!isRegistered) {
        this.sendError(res, 'User is not registered', 404);
        return;
      }

      const credits = await this.blockchainService.getUserCredits(validAddress);
      const userRegistration = await this.blockchainService.getUserRegistration(validAddress);
      
      // TODO: Add pending proposals, created wallets, etc.
      
      this.sendResponse(res, {
        user: {
          address: validAddress,
          credits,
          registrationDate: userRegistration?.registrationDate,
          registrationId: userRegistration?.registrationId
        },
        pendingProposals: [], // TODO: Implement
        createdWallets: [], // TODO: Implement
        recentActivity: [] // TODO: Implement
      });
      
    } catch (error) {
      console.error('❌ [DASHBOARD] Dashboard load failed:', error);
      this.sendError(res, `Dashboard load failed: ${error.message}`, 500);
    }
  }

  // Test blockchain write capability
  public async testBlockchainWrite(req: Request, res: Response): Promise<void> {
    try {
      console.log(`[TEST] Starting blockchain write test`);
      
      // Test basic write capability
      const success = await this.blockchainService.testBlockchainWrite();
      
      const result = {
        blockchainWriteTest: success,
        timestamp: new Date().toISOString(),
        message: success ? 'Blockchain write capability confirmed' : 'Blockchain write test failed'
      };
      
      console.log(`[TEST] Blockchain write test result: ${success}`);
      this.sendResponse(res, result);
      
    } catch (error) {
      console.error('[TEST] Blockchain write test error:', error);
      this.sendError(res, 'Blockchain write test failed', 500);
    }
  }
}