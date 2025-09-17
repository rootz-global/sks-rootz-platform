import { Request, Response } from 'express';
import { AuthorizationRequestService } from '../services/authorization/AuthorizationRequestService';

/**
 * Test Authorization Endpoints
 * 
 * Provides test endpoints to validate the authorization system
 * without needing the full email processing pipeline.
 */
export class AuthorizationTestController {
  private authService: AuthorizationRequestService;

  constructor() {
    this.authService = new AuthorizationRequestService();
  }

  /**
   * POST /.rootz/test/authorization/create-test-request
   * Create a test authorization request for development/testing
   */
  async createTestRequest(req: Request, res: Response): Promise<void> {
    try {
      const testData = {
        userAddress: req.body.userAddress || '0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b',
        emailSubject: req.body.emailSubject || 'Test Email - DATA_WALLET Authorization',
        emailSender: req.body.emailSender || 'steven@rivetz.com',
        emailHash: req.body.emailHash || '0x' + Date.now().toString(16),
        attachmentCount: req.body.attachmentCount || 0,
        attachmentHashes: req.body.attachmentHashes || [],
        ipfsHash: req.body.ipfsHash || 'QmTestHash12345',
        metadata: {
          source: 'test-controller',
          createdBy: 'authorization-test',
          testData: true
        }
      };

      console.log(`🧪 Creating test authorization request:`);
      console.log(`   User: ${testData.userAddress}`);
      console.log(`   Subject: ${testData.emailSubject}`);

      const result = await this.authService.createAuthorizationRequest(testData);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Test authorization request created',
          data: result.data,
          requestId: result.requestId,
          testInstructions: {
            authorizationUrl: result.data?.authorizationUrl,
            apiEndpoint: `/.rootz/authorization/request/${result.requestId}`,
            userPendingEndpoint: `/.rootz/authorization/pending/${testData.userAddress}`,
            authorizeEndpoint: '/.rootz/authorization/authorize',
            sampleAuthorizePayload: {
              requestId: result.requestId,
              userAddress: testData.userAddress,
              signature: '0x1234567890abcdef...' // User needs to sign with MetaMask
            }
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          message: 'Failed to create test authorization request'
        });
      }

    } catch (error) {
      console.error('❌ Test authorization creation error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * GET /.rootz/test/authorization/stats
   * Get authorization service statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.authService.getHealthStatus();
      
      res.json({
        success: true,
        service: 'AuthorizationRequestService',
        ...health
      });

    } catch (error) {
      console.error('❌ Authorization stats error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * POST /.rootz/test/authorization/simulate-flow
   * Simulate complete authorization flow for testing
   */
  async simulateAuthorizationFlow(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.body.userAddress || '0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b';
      const testSignature = '0xtest' + Date.now().toString(16);

      console.log(`🔄 Simulating complete authorization flow for ${userAddress}`);

      // Step 1: Create request
      const createResult = await this.authService.createAuthorizationRequest({
        userAddress,
        emailSubject: 'Simulated Email Flow Test',
        emailSender: 'test@example.com',
        emailHash: '0x' + Math.random().toString(16).substring(2),
        attachmentCount: 1,
        ipfsHash: 'QmSimulatedFlow123',
        metadata: { simulation: true }
      });

      if (!createResult.success) {
        throw new Error(`Failed to create request: ${createResult.error}`);
      }

      const requestId = createResult.requestId!;
      console.log(`✅ Step 1: Request created - ${requestId}`);

      // Step 2: Get request details
      const request = await this.authService.getAuthorizationRequest(requestId);
      if (!request) {
        throw new Error('Failed to retrieve created request');
      }
      console.log(`✅ Step 2: Request retrieved - Status: ${request.status}`);

      // Step 3: Get pending requests for user
      const pendingRequests = await this.authService.getPendingRequestsForUser(userAddress);
      console.log(`✅ Step 3: Found ${pendingRequests.length} pending requests`);

      // Step 4: Authorize request
      const authorizeResult = await this.authService.authorizeRequest(requestId, userAddress, testSignature);
      if (!authorizeResult.success) {
        throw new Error(`Failed to authorize: ${authorizeResult.error}`);
      }
      console.log(`✅ Step 4: Request authorized`);

      // Step 5: Mark as processed (simulate blockchain wallet creation)
      const processResult = await this.authService.markRequestProcessed(
        requestId, 
        'wallet_sim_' + Date.now(), 
        '0xsim' + Date.now().toString(16)
      );
      if (!processResult.success) {
        throw new Error(`Failed to mark processed: ${processResult.error}`);
      }
      console.log(`✅ Step 5: Request marked as processed`);

      // Return complete flow result
      res.json({
        success: true,
        message: 'Authorization flow simulation completed successfully',
        flowSteps: {
          step1_created: { requestId, status: 'success' },
          step2_retrieved: { status: request.status },
          step3_pending_count: pendingRequests.length,
          step4_authorized: { status: 'success' },
          step5_processed: { status: 'success' }
        },
        finalRequestState: await this.authService.getAuthorizationRequest(requestId),
        authorizationUrl: createResult.data?.authorizationUrl
      });

    } catch (error) {
      console.error('❌ Authorization flow simulation error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Simulation failed'
      });
    }
  }
}

export default AuthorizationTestController;