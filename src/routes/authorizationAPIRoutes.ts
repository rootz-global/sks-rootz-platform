import express from 'express';
import AuthorizationAPIController from '../controllers/AuthorizationAPIController';

/**
 * Authorization Routes
 * 
 * Clean, focused routing for email wallet authorization requests.
 * Uses new AuthorizationAPIController for proper service separation.
 */

const router = express.Router();
const authController = new AuthorizationAPIController();

// Create new authorization request
router.post('/create', authController.createAuthorizationRequest.bind(authController));

// Get authorization request by ID
router.get('/request/:requestId', authController.getAuthorizationRequest.bind(authController));

// Get authorization request by auth token  
router.get('/token/:authToken', authController.getAuthorizationRequestByToken.bind(authController));

// Get pending requests for user
router.get('/pending/:userAddress', authController.getPendingRequests.bind(authController));

// Authorize request (user action)
router.post('/authorize', authController.authorizeRequest.bind(authController));

// Cancel/reject request
router.post('/cancel', authController.cancelRequest.bind(authController));

// Mark request as processed (internal)
router.post('/process', authController.markRequestProcessed.bind(authController));

// Health check
router.get('/health', authController.getHealthStatus.bind(authController));

console.log('✅ Authorization API routes configured');
console.log('   POST   /create - Create authorization request');
console.log('   GET    /request/:requestId - Get request by ID');
console.log('   GET    /token/:authToken - Get request by token');
console.log('   GET    /pending/:userAddress - Get user pending requests');
console.log('   POST   /authorize - Authorize request');
console.log('   POST   /cancel - Cancel request');
console.log('   POST   /process - Mark as processed');
console.log('   GET    /health - Service health');

export default router;