import { Router } from 'express';
import TestController from '../controllers/TestController';
import { RegistrationTestController } from '../controllers/RegistrationTestController';

const router = Router();
const testController = new TestController();
const registrationTestController = new RegistrationTestController();

// Test routes
router.get('/complete-wallet-creation', testController.testDataWalletCreation.bind(testController));
router.get('/create-test-email', testController.createTestEmail.bind(testController));
router.post('/create-test-email', testController.createTestEmail.bind(testController));

// Registration test endpoints
router.get('/registration-lookup', registrationTestController.lookupByEmail.bind(registrationTestController));
router.get('/user-registration', registrationTestController.checkUserRegistration.bind(registrationTestController));
router.get('/validate-mapping', registrationTestController.validateMapping.bind(registrationTestController));

export default router;
