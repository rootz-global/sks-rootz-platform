import { Request, Response } from 'express';
import { DataWalletCreationTest } from '../tests/DataWalletCreationTest';

export class TestController {
  
  /**
   * Test complete DATA_WALLET creation flow
   */
  async testDataWalletCreation(req: Request, res: Response): Promise<void> {
    try {
      console.log('🧪 Starting DATA_WALLET creation test...');
      
      const test = new DataWalletCreationTest();
      await test.testCompleteFlow();
      
      res.json({
        success: true,
        message: 'DATA_WALLET creation test completed',
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ Test controller error:', error);
      
      res.status(500).json({
        success: false,
        error: error?.message || 'Test failed',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Create a new email for testing
   */
  async createTestEmail(req: Request, res: Response): Promise<void> {
    try {
      const testEmail = {
        userAddress: req.body.userAddress || "0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b",
        rawEmail: `From: test-wallet-creation@example.com
To: user@rootz.global
Subject: DATA_WALLET Creation Test - ${new Date().toISOString()}
Date: ${new Date().toUTCString()}

This email is being processed to test the complete DATA_WALLET creation flow including:
1. Email parsing and validation
2. Real IPFS upload to rootz.digital
3. Blockchain authorization request creation
4. Simulated user MetaMask signature
5. Complete DATA_WALLET creation on Polygon blockchain

Test timestamp: ${Date.now()}
`,
        notifyUser: true
      };
      
      console.log('📧 Creating test email for DATA_WALLET creation...');
      
      // This would normally call the email processing service
      // For now, return the test data
      res.json({
        success: true,
        testEmail,
        message: 'Test email prepared - use /process endpoint to create DATA_WALLET',
        instructions: [
          'Use POST /.rootz/email-processing/process with this email data',
          'Then call GET /.rootz/test/complete-wallet-creation to finish the flow'
        ]
      });
      
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to create test email'
      });
    }
  }
}

export default TestController;
