import { AuthorizationRequestService, AuthorizationRequestCreateData } from './authorization/AuthorizationRequestService';

/**
 * Email Processing Integration Service
 * 
 * Bridges email processing with authorization request creation.
 * Called when emails are received and need user authorization.
 */
export class EmailToAuthorizationBridge {
  private authService: AuthorizationRequestService;

  constructor() {
    this.authService = new AuthorizationRequestService();
  }

  /**
   * Process received email and create authorization request
   * 
   * Called by email monitoring service when email needs authorization
   */
  async processEmailForAuthorization(emailData: {
    userAddress: string;
    fromAddress: string;
    subject: string;
    contentHash: string;
    attachmentCount?: number;
    attachmentHashes?: string[];
    ipfsHash?: string;
    rawEmailData?: any;
  }): Promise<{ success: boolean; requestId?: string; authorizationUrl?: string; error?: string }> {
    
    try {
      console.log(`📧 Processing email for authorization:`);
      console.log(`   User: ${emailData.userAddress}`);
      console.log(`   From: ${emailData.fromAddress}`);
      console.log(`   Subject: ${emailData.subject}`);

      // Create authorization request
      const createData: AuthorizationRequestCreateData = {
        userAddress: emailData.userAddress,
        emailSubject: emailData.subject,
        emailSender: emailData.fromAddress,
        emailHash: emailData.contentHash,
        attachmentCount: emailData.attachmentCount || 0,
        attachmentHashes: emailData.attachmentHashes || [],
        ipfsHash: emailData.ipfsHash,
        metadata: {
          processedAt: new Date().toISOString(),
          rawEmailData: emailData.rawEmailData
        }
      };

      const result = await this.authService.createAuthorizationRequest(createData);

      if (result.success) {
        console.log(`✅ Authorization request created: ${result.requestId}`);
        
        // TODO: Send notification to user (email/SMS/push)
        // For now, just log the authorization URL
        console.log(`🔗 Authorization URL: ${result.data?.authorizationUrl}`);
        
        return {
          success: true,
          requestId: result.requestId,
          authorizationUrl: result.data?.authorizationUrl
        };
      } else {
        console.error(`❌ Failed to create authorization request: ${result.error}`);
        return {
          success: false,
          error: result.error
        };
      }

    } catch (error) {
      console.error('❌ Email to authorization bridge error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get authorization service for direct access if needed
   */
  getAuthorizationService(): AuthorizationRequestService {
    return this.authService;
  }
}