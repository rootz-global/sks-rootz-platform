import { Router } from 'express';
import EmailProcessingController from '../controllers/EmailProcessingController';
import AuthorizationController from '../controllers/AuthorizationController';
import { Config } from '../core/configuration';

export function createEmailProcessingRoutes(config: Config): Router {
  const router = Router();
  const controller = new EmailProcessingController(config);
  const authController = new AuthorizationController(config);
  
  /**
   * Process email and create authorization request
   * POST /.rootz/email-processing/process
   */
  router.post('/process', (req, res) => controller.processEmail(req, res));
  
  /**
   * Get authorization requests for user (for UI)
   * GET /.rootz/email-processing/authorization-requests/:userAddress
   */
  router.get('/authorization-requests/:userAddress', (req, res) => authController.getAuthorizationRequests(req, res));
  
  /**
   * Process user authorization (user signs, service submits)
   * POST /.rootz/email-processing/authorize
   */
  router.post('/authorize', (req, res) => authController.processUserAuthorization(req, res));
  
  /**
   * Reject authorization request
   * POST /.rootz/email-processing/reject
   */
  router.post('/reject', (req, res) => authController.rejectRequest(req, res));
  
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
