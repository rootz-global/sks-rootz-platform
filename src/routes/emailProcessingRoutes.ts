import { Router } from 'express';
import EmailProcessingController from '../controllers/EmailProcessingController';
import { Config } from '../core/configuration';

export function createEmailProcessingRoutes(config: Config): Router {
  const router = Router();
  const controller = new EmailProcessingController(config);
  
  /**
   * Process email and create authorization request
   * POST /.rootz/email-processing/process
   */
  router.post('/process', (req, res) => controller.processEmail(req, res));
  
  /**
   * Get authorization request details (for web interface)
   * GET /.rootz/email-processing/authorization-requests/:requestId
   */
  router.get('/authorization-requests/:requestId', (req, res) => controller.getAuthorizationRequest(req, res));
  
  /**
   * Handle blockchain authorization completion notification
   * POST /.rootz/email-processing/authorization-complete
   */
  router.post('/authorization-complete', (req, res) => controller.handleAuthorizationComplete(req, res));
  
  /**
   * Process user authorization
   * POST /.rootz/email-processing/authorize
   */
  router.post('/authorize', (req, res) => controller.processUserAuthorization(req, res));
  
  /**
   * Process user authorization (legacy endpoint)
   * POST /.rootz/email-processing/authorize/:requestId
   */
  router.post('/authorize/:requestId', (req, res) => controller.processAuthorization(req, res));
  
  /**
   * Complete wallet creation after authorization
   * POST /.rootz/email-processing/complete/:requestId
   */
  router.post('/complete/:requestId', (req, res) => controller.completeWalletCreation(req, res));
  
  /**
   * Get processing status
   * GET /.rootz/email-processing/status/:requestId
   */
  router.get('/status/:requestId', (req, res) => controller.getProcessingStatus(req, res));
  
  /**
   * Test email parsing (no blockchain operations)
   * POST /.rootz/email-processing/test-parse
   */
  router.post('/test-parse', (req, res) => controller.testEmailParsing(req, res));
  
  /**
   * Health check for email processing services
   * GET /.rootz/email-processing/health
   */
  router.get('/health', (req, res) => controller.healthCheck(req, res));
  
  return router;
}

export default createEmailProcessingRoutes;
