import { Request, Response } from 'express';
import { Config } from '../core/configuration';
import AuthorizationService from '../services/authorization/AuthorizationService';
import LocalIPFSService from '../services/ipfs/PinataIPFSService';
import EmailParser from '../services/email-processing/EmailParser';

/**
 * Email Processing Controller - Proper Architecture
 * Handles email → IPFS → blockchain authorization request flow
 */
export class EmailProcessingController {
  private config: Config;
  private authService: AuthorizationService;
  private ipfsService: LocalIPFSService;
  private emailParser: EmailParser;

  constructor(config: Config) {
    this.config = config;
    this.authService = new AuthorizationService(config);
    this.ipfsService = new LocalIPFSService(config);
    this.emailParser = new EmailParser();
    
    console.log('🚀 Initializing Email Processing Controller...');
    
    // Initialize IPFS service asynchronously
    this.initializeServices();
  }

  /**
   * Initialize services asynchronously
   */
  private async initializeServices(): Promise<void> {
    try {
      await this.ipfsService.initialize();
      console.log('✅ Email Processing Controller ready');
    } catch (error) {
      console.error('❌ Failed to initialize Email Processing Controller:', error);
    }
  }

  /**
   * Process raw email into blockchain authorization request
   * POST /.rootz/email-processing/process
   */
  async processEmail(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress, rawEmail, notifyUser = true } = req.body;
      
      if (!userAddress || !rawEmail) {
        res.status(400).json({
          success: false,
          error: 'userAddress and rawEmail are required'
        });
        return;
      }

      console.log(`📧 Processing email for user: ${userAddress}`);

      // Step 1: Parse email (await the async operation)
      console.log(`📝 Step 1: Parsing email content...`);
      const parsedEmail = await this.emailParser.parseEmail(rawEmail);
      
      // Step 2: Upload to IPFS
      console.log(`📤 Step 2: Uploading to IPFS...`);
      const emailPackage = {
        emailData: {
          messageId: parsedEmail.messageId || `generated.${Date.now()}.${Math.random().toString(36)}@rootz.global`,
          subject: parsedEmail.subject || 'No Subject',
          from: parsedEmail.from || 'unknown@example.com',
          to: parsedEmail.to || ['user@rootz.global'],
          date: parsedEmail.date || new Date().toISOString(),
          bodyText: parsedEmail.bodyText || '',
          bodyHtml: parsedEmail.bodyHtml || '',
          headers: parsedEmail.headers || {},
          authentication: {
            spfPass: false,
            dkimValid: false,
            dmarcPass: false,
            receivedChain: []
          },
          hashes: {
            bodyHash: this.createHash(parsedEmail.bodyText || ''),
            emailHash: this.createHash(JSON.stringify(parsedEmail)),
            emailHeadersHash: this.createHash(JSON.stringify(parsedEmail.headers || {}))
          }
        },
        attachments: [], // TODO: Process attachments
        metadata: {
          createdAt: new Date().toISOString(),
          platform: 'SKS Rootz Platform',
          version: '1.0.0',
          totalSize: rawEmail.length
        }
      };

      const ipfsResult = await this.ipfsService.uploadEmailPackage(emailPackage, []);
      
      if (!ipfsResult.success) {
        res.status(500).json({
          success: false,
          error: 'Failed to upload to IPFS: ' + ipfsResult.error
        });
        return;
      }

      console.log(`✅ IPFS upload successful: ${ipfsResult.ipfsHash}`);

      // Step 3: Create blockchain authorization request
      console.log(`⛓️ Step 3: Creating blockchain authorization request...`);
      const authToken = `0x${Math.random().toString(16).substring(2, 18)}`;
      
      const authResult = await this.authService.createAuthorizationRequest(
        userAddress,
        parsedEmail,
        ipfsResult.ipfsHash || ''
      );

      if (!authResult.success) {
        res.status(500).json({
          success: false,
          error: 'Failed to create authorization request: ' + authResult.error
        });
        return;
      }

      console.log(`✅ Authorization request created: ${authResult.requestId}`);

      // Step 4: Generate email summary
      const attachmentCount = parsedEmail.attachments?.length || 0;
      const emailSummary = `📧 Email Summary:
  From: ${emailPackage.emailData.from}
  To: ${Array.isArray(emailPackage.emailData.to) ? emailPackage.emailData.to.join(', ') : emailPackage.emailData.to}
  Subject: ${emailPackage.emailData.subject}
  Date: ${emailPackage.emailData.date}
  Body Length: ${(emailPackage.emailData.bodyText || '').length} chars
  Attachments: ${attachmentCount}
  Auth: SPF=${emailPackage.emailData.authentication.spfPass} DKIM=${emailPackage.emailData.authentication.dkimValid} DMARC=${emailPackage.emailData.authentication.dmarcPass}
  Email Hash: ${emailPackage.emailData.hashes.emailHash.replace('0x', '')}
  Body Hash: ${emailPackage.emailData.hashes.bodyHash.replace('0x', '')}`;

      // Step 5: Create authorization URL for existing web interface
      const authorizationUrl = `http://rootz.global/static/services/email-data-wallet/authorization.html?token=${authToken}&request=${authResult.requestId}`;

      res.json({
        success: true,
        requestId: authResult.requestId,
        authToken,
        ipfsHash: ipfsResult.ipfsHash,
        emailSummary,
        authorizationUrl
      });

    } catch (error: any) {
      console.error('❌ Email processing failed:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Email processing failed'
      });
    }
  }

  /**
   * Create hash of content
   */
  private createHash(content: string): string {
    const crypto = require('crypto');
    return '0x' + crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get authorization requests for a user (for UI)
   * GET /.rootz/email-processing/authorization-requests/:userAddress
   */
  async getAuthorizationRequests(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress } = req.params;
      
      if (!userAddress) {
        res.status(400).json({
          success: false,
          error: 'User address is required'
        });
        return;
      }

      console.log(`📋 Getting authorization requests for user: ${userAddress}`);

      // For now, return empty array - implement database lookup later
      const requests: any[] = [];
      
      res.json({
        success: true,
        requests
      });

    } catch (error: any) {
      console.error('Failed to get authorization requests:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get authorization requests'
      });
    }
  }

  /**
   * Process user authorization signature
   * POST /.rootz/email-processing/authorize
   */
  async processUserAuthorization(req: Request, res: Response): Promise<void> {
    try {
      const { requestId, signature, userAddress } = req.body;
      
      if (!requestId || !signature || !userAddress) {
        res.status(400).json({
          success: false,
          error: 'requestId, signature, and userAddress are required'
        });
        return;
      }

      console.log(`🔐 Processing user authorization for request: ${requestId}`);

      // Get request details first
      const requestDetails = await this.authService.getAuthorizationRequest(requestId);
      
      if (!requestDetails) {
        res.status(404).json({
          success: false,
          error: 'Authorization request not found'
        });
        return;
      }

      // Submit user's signature to blockchain via service wallet
      // This would need to be implemented in AuthorizationService
      res.json({
        success: true,
        message: 'Authorization processing not yet implemented',
        requestId
      });

    } catch (error: any) {
      console.error('Failed to process user authorization:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to process authorization'
      });
    }
  }

  /**
   * Legacy authorization endpoint
   * POST /.rootz/email-processing/authorize/:requestId
   */
  async processAuthorization(req: Request, res: Response): Promise<void> {
    const { requestId } = req.params;
    const { signature, userAddress } = req.body;
    
    // Delegate to main authorization handler
    await this.processUserAuthorization({
      ...req,
      body: { requestId, signature, userAddress }
    } as Request, res);
  }

  /**
   * Complete wallet creation after authorization
   * POST /.rootz/email-processing/complete/:requestId
   */
  async completeWalletCreation(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      const { emailData, ipfsHash } = req.body;
      
      if (!requestId) {
        res.status(400).json({
          success: false,
          error: 'requestId is required'
        });
        return;
      }

      console.log(`📦 Completing wallet creation for request: ${requestId}`);

      // This would need to be implemented
      res.json({
        success: true,
        message: 'Wallet creation completion not yet implemented',
        requestId
      });

    } catch (error: any) {
      console.error('Failed to complete wallet creation:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to complete wallet creation'
      });
    }
  }

  /**
   * Get processing status
   * GET /.rootz/email-processing/status/:requestId
   */
  async getProcessingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;
      
      if (!requestId) {
        res.status(400).json({
          success: false,
          error: 'requestId is required'
        });
        return;
      }

      const requestDetails = await this.authService.getAuthorizationRequest(requestId);
      
      res.json({
        success: true,
        requestId,
        status: requestDetails ? 'found' : 'not_found',
        details: requestDetails
      });

    } catch (error: any) {
      console.error('Failed to get processing status:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get processing status'
      });
    }
  }

  /**
   * Test email parsing (no blockchain operations)
   * POST /.rootz/email-processing/test-parse
   */
  async testEmailParsing(req: Request, res: Response): Promise<void> {
    try {
      const { rawEmail } = req.body;
      
      if (!rawEmail) {
        res.status(400).json({
          success: false,
          error: 'rawEmail is required'
        });
        return;
      }

      const parsedEmail = await this.emailParser.parseEmail(rawEmail);
      
      res.json({
        success: true,
        parsedEmail,
        message: 'Email parsing successful'
      });

    } catch (error: any) {
      console.error('Email parsing test failed:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Email parsing failed'
      });
    }
  }

  /**
   * Health check for email processing services
   * GET /.rootz/email-processing/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const ipfsHealth = await this.ipfsService.healthCheck();
      const authHealth = await this.authService.healthCheck();
      
      const overallHealth = ipfsHealth.healthy && authHealth.healthy;
      
      res.status(overallHealth ? 200 : 503).json({
        success: overallHealth,
        services: {
          ipfs: ipfsHealth,
          authorization: authHealth
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('Health check failed:', error);
      res.status(503).json({
        success: false,
        error: error?.message || 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default EmailProcessingController;
