import { Router } from 'express';
import TestController from '../controllers/TestController';

const router = Router();
const testController = new TestController();

// Test routes
router.get('/complete-wallet-creation', testController.testDataWalletCreation.bind(testController));
router.get('/create-test-email', testController.createTestEmail.bind(testController));
router.post('/create-test-email', testController.createTestEmail.bind(testController));

export default router;
