import { Router } from 'express';
import TestController from '../controllers/TestController';
import { RegistrationTestController } from '../controllers/RegistrationTestController';
import AuthorizationTestController from '../controllers/AuthorizationTestController';

const router = Router();
const testController = new TestController();
const registrationTestController = new RegistrationTestController();
const authorizationTestController = new AuthorizationTestController();

// Test routes
router.get('/complete-wallet-creation', testController.testDataWalletCreation.bind(testController));
router.get('/create-test-email', testController.createTestEmail.bind(testController));
router.post('/create-test-email', testController.createTestEmail.bind(testController));

// Registration test endpoints
router.get('/registration-lookup', registrationTestController.lookupByEmail.bind(registrationTestController));
router.get('/user-registration', registrationTestController.checkUserRegistration.bind(registrationTestController));
router.get('/validate-mapping', registrationTestController.validateMapping.bind(registrationTestController));
router.get('/check-credits', registrationTestController.checkCredits.bind(registrationTestController));
router.post('/grant-credits', registrationTestController.grantCredits.bind(registrationTestController));

export default router;
