import { Request, Response } from 'express';
import EmailParser, { ParsedEmailData } from '../services/email-processing/EmailParser';
import LocalIPFSService from '../services/ipfs/LocalIPFSService';
import AuthorizationService from '../services/authorization/AuthorizationService';
import { Config } from '../core/configuration';

export interface EmailProcessingRequest {
  userAddress: string;
  rawEmail: string;
  notifyUser?: boolean;
}

export interface EmailProcessingResult {
  success: boolean;
  requestId?: string;
  authToken?: string;
  ipfsHash?: string;
  emailSummary?: string;
  authorizationUrl?: string;
  error?: string;
}

export class EmailProcessingController {
  private emailParser: EmailParser;
  private ipfsService: LocalIPFSService;
  private authService: AuthorizationService;
  private config: Config;
  
  constructor(config: Config) {
    this.config = config;
    this.emailParser = new EmailParser();
    this.ipfsService = new LocalIPFSService(config);
    this.authService = new AuthorizationService(config);
    
    // Initialize services
    this.initializeServices();
  }
  
  /**
   * Initialize all required services
   */
  private async initializeServices(): Promise<void> {
    try {
      console.log('🚀 Initializing Email Processing Controller...');
      
      // Initialize IPFS service
      await this.ipfsService.initialize();
      console.log('✅ IPFS service ready');
      
      console.log('✅ Email Processing Controller ready');
      
    } catch (error: any) {
      console.error('❌ Failed to initialize email processing controller:', error);
      throw error;
    }
  }
  
  /**
   * Process email and create authorization request
   * POST /.rootz/email-processing/process
   */
  async processEmail(req: Request, res: Response): Promise<void> {
    try {
      console.log('\n📧 Processing email for wallet creation...');
      
      const { userAddress, rawEmail, notifyUser = true }: EmailProcessingRequest = req.body;
      
      if (!userAddress || !rawEmail) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: userAddress, rawEmail'
        });
        return;
      }
      
      console.log(`👤 User: ${userAddress}`);
      console.log(`📄 Email size: ${rawEmail.length} characters`);
      
      const result = await this.processEmailInternal(userAddress, rawEmail, notifyUser);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
      
    } catch (error: any) {
      console.error('❌ Email processing error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Email processing failed'
      });
    }
  }
  
  /**
   * Internal email processing workflow
   */
  async processEmailInternal(
    userAddress: string,
    rawEmail: string,
    notifyUser: boolean
  ): Promise<EmailProcessingResult> {
    
    try {
      // Step 1: Parse email
      console.log('📝 Step 1: Parsing email content...');
      const emailData = await this.emailParser.parseEmail(rawEmail);
      
      // Validate parsed data
      const validation = this.emailParser.validateEmailData(emailData);
      if (!validation.valid) {
        throw new Error(`Email validation failed: ${validation.errors.join(', ')}`);
      }
      
      console.log('✅ Email parsed successfully');
      console.log(this.emailParser.createEmailSummary(emailData));
      
      // Step 2: Upload to IPFS
      console.log('\n💾 Step 2: Uploading to local IPFS...');
      const ipfsResult = await this.ipfsService.uploadEmailPackage(emailData, emailData.attachments);
      
      if (!ipfsResult.success) {
        throw new Error(`IPFS upload failed: ${ipfsResult.error}`);
      }
      
      console.log(`✅ Email uploaded to IPFS: ${ipfsResult.ipfsHash}`);
      
      // Step 3: Create authorization request
      console.log('\n🔐 Step 3: Creating authorization request...');
      const authResult = await this.authService.createAuthorizationRequest(
        userAddress,
        emailData,
        ipfsResult.ipfsHash!
      );
      
      if (!authResult.success) {
        throw new Error(`Authorization request failed: ${authResult.error}`);
      }
      
      console.log(`✅ Authorization request created: ${authResult.requestId}`);
      
      // Step 4: Generate authorization URL
      const authUrl = this.generateAuthorizationUrl(authResult.authToken!, authResult.requestId!);
      
      // Step 5: Send notification (if requested)
      if (notifyUser) {
        await this.sendUserNotification(userAddress, emailData, authUrl);
      }
      
      console.log('\n🎉 Email processing completed successfully!');
      console.log(`📝 Summary:`);
      console.log(`   Email: ${emailData.subject} from ${emailData.from}`);
      console.log(`   IPFS: ${ipfsResult.ipfsHash}`);
      console.log(`   Request: ${authResult.requestId}`);
      console.log(`   Auth URL: ${authUrl}`);
      
      return {
        success: true,
        requestId: authResult.requestId!,
        authToken: authResult.authToken!,
        ipfsHash: ipfsResult.ipfsHash!,
        emailSummary: this.emailParser.createEmailSummary(emailData),
        authorizationUrl: authUrl
      };
      
    } catch (error: any) {
      console.error('❌ Email processing workflow failed:', error);
      return {
        success: false,
        error: error?.message || 'Processing workflow failed'
      };
    }
  }
  
  /**
   * Process user authorization (when they sign via MetaMask)
   * POST /.rootz/email-processing/authorize/:requestId
   */
  async processAuthorization(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const { signature, userAddress } = req.body;
      
      console.log(`\n🔐 Processing user authorization for request: ${requestId}`);
      console.log(`👤 User: ${userAddress}`);
      
      if (!signature) {
        res.status(400).json({
          success: false,
          error: 'Missing signature'
        });
        return;
      }
      
      // Get original authorization request details
      const authRequest = await this.authService.getAuthorizationRequest(requestId);
      if (!authRequest) {
        res.status(404).json({
          success: false,
          error: 'Authorization request not found'
        });
        return;
      }
      
      // Note: The actual signature verification and wallet creation 
      // happens on the blockchain when the user calls the contract directly
      // This endpoint is for our backend to know about the authorization
      
      console.log('✅ Authorization processed - user will sign transaction on blockchain');
      
      res.json({
        success: true,
        message: 'Authorization received - please complete transaction on blockchain',
        requestId,
        contractAddress: this.config.get('CONTRACT_AUTHORIZATION'),
        userAddress: authRequest.userAddress
      });
      
    } catch (error: any) {
      console.error('❌ Authorization processing error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Authorization processing failed'
      });
    }
  }
  
  /**
   * Complete wallet creation after user authorization
   * POST /.rootz/email-processing/complete/:requestId
   */
  async completeWalletCreation(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const { emailData, ipfsHash } = req.body;
      
      console.log(`\n🏁 Completing wallet creation for request: ${requestId}`);
      
      if (!emailData || !ipfsHash) {
        res.status(400).json({
          success: false,
          error: 'Missing emailData or ipfsHash'
        });
        return;
      }
      
      // Process the authorized request on blockchain
      const result = await this.authService.processAuthorizedRequest(
        requestId,
        emailData,
        ipfsHash
      );
      
      if (result.success) {
        console.log('✅ Wallet creation completed successfully');
        console.log(`   Email Wallet ID: ${result.emailWalletId}`);
        console.log(`   Attachment Wallets: ${result.attachmentWalletIds?.length || 0}`);
        console.log(`   Credits Used: ${result.totalCreditsUsed}`);
        
        res.json(result);
      } else {
        res.status(500).json(result);
      }
      
    } catch (error: any) {
      console.error('❌ Wallet creation completion error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Wallet creation failed'
      });
    }
  }
  
  /**
   * Get email processing status
   * GET /.rootz/email-processing/status/:requestId
   */
  async getProcessingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      
      const authRequest = await this.authService.getAuthorizationRequest(requestId);
      
      if (!authRequest) {
        res.status(404).json({
          success: false,
          error: 'Request not found'
        });
        return;
      }
      
      res.json({
        success: true,
        request: authRequest
      });
      
    } catch (error: any) {
      console.error('❌ Status check error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Status check failed'
      });
    }
  }
  
  /**
   * Test email parsing without blockchain operations
   * POST /.rootz/email-processing/test-parse
   */
  async testEmailParsing(req: Request, res: Response): Promise<void> {
    try {
      const { rawEmail } = req.body;
      
      if (!rawEmail) {
        res.status(400).json({
          success: false,
          error: 'Missing rawEmail'
        });
        return;
      }
      
      console.log('🧪 Testing email parsing...');
      
      const emailData = await this.emailParser.parseEmail(rawEmail);
      const validation = this.emailParser.validateEmailData(emailData);
      const summary = this.emailParser.createEmailSummary(emailData);
      
      res.json({
        success: true,
        emailData: {
          messageId: emailData.messageId,
          subject: emailData.subject,
          from: emailData.from,
          to: emailData.to,
          date: emailData.date,
          attachmentCount: emailData.attachments.length,
          hashes: {
            bodyHash: emailData.bodyHash,
            emailHash: emailData.emailHash,
            emailHeadersHash: emailData.emailHeadersHash
          },
          authentication: emailData.authentication
        },
        validation,
        summary
      });
      
    } catch (error: any) {
      console.error('❌ Email parsing test error:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Email parsing test failed'
      });
    }
  }
  
  /**
   * Health check for all email processing services
   * GET /.rootz/email-processing/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const ipfsHealth = await this.ipfsService.healthCheck();
      const authHealth = await this.authService.healthCheck();
      
      const overallHealthy = ipfsHealth.healthy && authHealth.healthy;
      
      res.status(overallHealthy ? 200 : 503).json({
        healthy: overallHealthy,
        services: {
          ipfs: ipfsHealth,
          authorization: authHealth,
          emailParser: { healthy: true, details: { initialized: true } }
        }
      });
      
    } catch (error: any) {
      res.status(503).json({
        healthy: false,
        error: error?.message || 'Health check failed'
      });
    }
  }
  
  /**
   * Generate authorization URL for user
   */
  private generateAuthorizationUrl(authToken: string, requestId: string): string {
    const baseUrl = this.config.get('BASE_URL', 'http://rootz.global');
    return `${baseUrl}/static/services/email-data-wallet/authorization.html?token=${authToken}&request=${requestId}`;
  }
  
  /**
   * Send notification to user about authorization request
   */
  private async sendUserNotification(
    userAddress: string,
    emailData: ParsedEmailData,
    authUrl: string
  ): Promise<void> {
    
    try {
      console.log('📧 Sending user notification...');
      
      // TODO: Implement notification service
      // For now, just log the notification details
      console.log(`📝 Notification would be sent:`);
      console.log(`   To: ${userAddress}`);
      console.log(`   Email: ${emailData.subject} from ${emailData.from}`);
      console.log(`   Auth URL: ${authUrl}`);
      
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      // Don't fail the whole process if notification fails
    }
  }
}

export default EmailProcessingController;
