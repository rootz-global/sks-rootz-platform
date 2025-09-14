import { Request, Response } from 'express';
import { Controller } from './Controller';
import { BlockchainService } from '../services/BlockchainService';
import { GraphEmailMonitorService } from '../services/GraphEmailMonitorService';

export class EmailWalletController extends Controller {
  private blockchainService: BlockchainService;
  private emailMonitorService: GraphEmailMonitorService;

  constructor(domain: string = 'localhost') {
    super();
    // We'll get config from the request for now
    this.blockchainService = null as any; // Initialize later with config
    this.emailMonitorService = null as any; // Initialize later with config
  }

  private initializeServices(req: Request): void {
    if (!this.blockchainService) {
      const config = this.getConfigFromRequest(req);
      this.blockchainService = new BlockchainService(config);
      this.emailMonitorService = new GraphEmailMonitorService('localhost'); // TODO: get domain from request
    }
  }

  private validateEthereumAddress(address: string): string | null {
    try {
      // Basic Ethereum address validation
      if (!address || typeof address !== 'string') {
        return null;
      }
      
      // Remove 0x prefix if present and validate hex
      const cleanAddress = address.toLowerCase().startsWith('0x') ? address : '0x' + address;
      
      if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
        return null;
      }
      
      return cleanAddress;
    } catch (error) {
      return null;
    }
  }

  // User Registration
  public async register(req: Request, res: Response): Promise<void> {
    try {
      console.log('📝 [REGISTER] Processing user registration request');
      
      this.initializeServices(req);
      
      const { userAddress, signature, message } = req.body;
      
      if (!userAddress || !signature || !message) {
        this.sendError(res, 'Missing required fields: userAddress, signature, message', 400);
        return;
      }

      // Validate Ethereum address format
      const validAddress = this.validateEthereumAddress(userAddress);
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

      // Register user with default email
      const defaultEmail = `${validAddress.toLowerCase()}@temp.rootz.global`;
      const success = await this.blockchainService.registerEmailWallet(validAddress, defaultEmail);
      
      if (!success) {
        this.sendError(res, 'Registration failed', 500);
        return;
      }

      // Deposit initial credits
      await this.blockchainService.depositCredits(validAddress, "0.006");

      console.log(`✅ [REGISTER] User ${validAddress} registered successfully`);
      
      this.sendResponse(res, {
        success: true,
        userAddress: validAddress,
        email: defaultEmail,
        initialCredits: 60,
        message: 'User registered successfully'
      });
      
    } catch (error) {
      console.error('❌ [REGISTER] Registration failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      this.sendError(res, `Registration failed: ${errorMessage}`, 500);
    }
  }

  // Get User Credit Balance
  public async getBalance(req: Request, res: Response): Promise<void> {
    try {
      this.initializeServices(req);
      
      const { address } = req.params;
      
      if (!address) {
        this.sendError(res, 'Address parameter is required', 400);
        return;
      }

      const validAddress = this.validateEthereumAddress(address);
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
      const errorMessage = error instanceof Error ? error.message : 'Balance check failed';
      this.sendError(res, `Balance check failed: ${errorMessage}`, 500);
    }
  }

  // Email Monitoring Management
  public async startEmailMonitoring(req: Request, res: Response): Promise<void> {
    try {
      console.log('🚀 [EMAIL] Starting email monitoring service');
      
      this.initializeServices(req);
      
      await this.emailMonitorService.startMonitoring();
      
      this.sendResponse(res, {
        success: true,
        message: 'Email monitoring started successfully',
        status: this.emailMonitorService.getStatus()
      });
      
    } catch (error) {
      console.error('❌ [EMAIL] Failed to start email monitoring:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start email monitoring';
      this.sendError(res, `Failed to start email monitoring: ${errorMessage}`, 500);
    }
  }

  public async stopEmailMonitoring(req: Request, res: Response): Promise<void> {
    try {
      console.log('🛑 [EMAIL] Stopping email monitoring service');
      
      this.initializeServices(req);
      
      this.emailMonitorService.stopMonitoring();
      
      this.sendResponse(res, {
        success: true,
        message: 'Email monitoring stopped successfully'
      });
      
    } catch (error) {
      console.error('❌ [EMAIL] Failed to stop email monitoring:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop email monitoring';
      this.sendError(res, `Failed to stop email monitoring: ${errorMessage}`, 500);
    }
  }

  public async getEmailMonitoringStatus(req: Request, res: Response): Promise<void> {
    try {
      this.initializeServices(req);
      
      const status = this.emailMonitorService.getStatus();
      
      this.sendResponse(res, {
        success: true,
        emailMonitoring: status
      });
      
    } catch (error) {
      console.error('❌ [EMAIL] Failed to get email monitoring status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get email monitoring status';
      this.sendError(res, `Failed to get email monitoring status: ${errorMessage}`, 500);
    }
  }

  // Test Email Processing
  public async testEmailProcessing(req: Request, res: Response): Promise<void> {
    try {
      console.log('🧪 [EMAIL] Testing email processing');
      
      this.initializeServices(req);
      
      await this.emailMonitorService.testEmailProcessing();
      
      this.sendResponse(res, {
        success: true,
        message: 'Email processing test completed successfully'
      });
      
    } catch (error) {
      console.error('❌ [EMAIL] Email processing test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Email processing test failed';
      this.sendError(res, `Email processing test failed: ${errorMessage}`, 500);
    }
  }

  // Wallet Creation Proposal Management
  public async createWalletProposal(req: Request, res: Response): Promise<void> {
    try {
      console.log('📧 [PROPOSAL] Creating wallet proposal');
      
      this.initializeServices(req);
      
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

      const validAddress = this.validateEthereumAddress(userAddress);
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
      const errorMessage = error instanceof Error ? error.message : 'Proposal creation failed';
      this.sendError(res, `Proposal creation failed: ${errorMessage}`, 500);
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
      const errorMessage = error instanceof Error ? error.message : 'Authorization failed';
      this.sendError(res, `Authorization failed: ${errorMessage}`, 500);
    }
  }

  // User Dashboard Data
  public async getUserDashboard(req: Request, res: Response): Promise<void> {
    try {
      this.initializeServices(req);
      
      const { address } = req.params;
      
      if (!address) {
        this.sendError(res, 'Address parameter is required', 400);
        return;
      }

      const validAddress = this.validateEthereumAddress(address);
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
          registrationDate: userRegistration?.registeredAt ? new Date(userRegistration.registeredAt * 1000).toISOString() : null,
          registrationId: userRegistration?.registrationId
        },
        pendingProposals: [], // TODO: Implement
        createdWallets: [], // TODO: Implement
        recentActivity: [] // TODO: Implement
      });
      
    } catch (error) {
      console.error('❌ [DASHBOARD] Dashboard load failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Dashboard load failed';
      this.sendError(res, `Dashboard load failed: ${errorMessage}`, 500);
    }
  }

  // Test blockchain write capability - ENHANCED FOR NEW CONTRACT
  public async testBlockchainWrite(req: Request, res: Response): Promise<void> {
    try {
      console.log(`[TEST] Starting enhanced blockchain write test`);
      
      this.initializeServices(req);
      
      // Test basic write capability
      const basicWriteSuccess = await this.blockchainService.testBlockchainWrite();
      console.log(`[TEST] Basic blockchain write test: ${basicWriteSuccess}`);
      
      // Test new enhanced contract functions
      let enhancedContractTest = false;
      try {
        // Test getting user email wallets (should work even if user has 0 wallets)
        const testUserAddress = '0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b';
        const userWallets = await this.blockchainService.getUserEmailWallets(testUserAddress);
        const activeWalletCount = await this.blockchainService.getActiveWalletCount(testUserAddress);
        
        console.log(`[TEST] Enhanced contract test - User wallets: ${userWallets.length}, Active: ${activeWalletCount}`);
        enhancedContractTest = true;
      } catch (enhancedError) {
        console.error(`[TEST] Enhanced contract test failed:`, enhancedError);
        enhancedContractTest = false;
      }
      
      const overallSuccess = basicWriteSuccess && enhancedContractTest;
      
      const result = {
        blockchainWriteTest: overallSuccess,
        basicWrite: basicWriteSuccess,
        enhancedContract: enhancedContractTest,
        timestamp: new Date().toISOString(),
        message: overallSuccess 
          ? 'Enhanced blockchain integration working correctly' 
          : 'Blockchain integration test failed - check logs for details'
      };
      
      console.log(`[TEST] Overall blockchain test result: ${overallSuccess}`);
      this.sendResponse(res, result);
      
    } catch (error) {
      console.error('[TEST] Blockchain write test error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Blockchain write test failed';
      this.sendError(res, errorMessage, 500);
    }
  }
}