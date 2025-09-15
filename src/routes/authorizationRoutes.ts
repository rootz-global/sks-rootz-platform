import { Router } from 'express';
import AuthorizationController from '../controllers/AuthorizationController';

const router = Router();
const authController = new AuthorizationController();

// Authorization request management
router.get('/request/:requestId', authController.getAuthorizationRequest.bind(authController));
router.get('/token/:authToken', authController.getAuthorizationRequestByToken.bind(authController));

// User authorization endpoints
router.post('/authorize', authController.authorizeEmailWallet.bind(authController));
router.post('/reject', authController.cancelRequest.bind(authController));

// User request management
router.get('/user/:userAddress/requests', authController.getUserRequests.bind(authController));

// Service endpoints
router.post('/process', authController.processAuthorizedRequest.bind(authController));
router.get('/health', authController.getHealthStatus.bind(authController));

// Web interface
router.get('/page', authController.serveAuthorizationPage.bind(authController));

export default router;