// SKS Rootz Platform - Core Platform Class (EPISTERY Pattern)

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { Config } from './config/Config';
import { StatusController } from './controllers/StatusController';
import { EmailWalletController } from './controllers/EmailWalletController';

export class RootzPlatform {
  private static instance: RootzPlatform;
  private config: Config;
  private isInitialized = false;

  private constructor() {
    this.config = new Config();
  }

  public static async connect(): Promise<RootzPlatform> {
    if (!RootzPlatform.instance) {
      RootzPlatform.instance = new RootzPlatform();
      await RootzPlatform.instance.initialize();
    }
    return RootzPlatform.instance;
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🔧 Initializing SKS Rootz Platform...');
    
    // Load configuration (EPISTERY pattern)
    await this.config.initialize();
    
    this.isInitialized = true;
    console.log('✅ Platform initialization complete');
  }

  // Attach to existing Express app (EPISTERY pattern)
  public async attach(app: express.Application): Promise<void> {
    console.log('🔗 Attaching SKS Rootz Platform to existing app...');
    
    // Add body parsing middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Domain resolution middleware (EPISTERY pattern)
    app.use(this.domainResolutionMiddleware.bind(this));
    
    // Attach platform routes under /.rootz/ (well-known path)
    app.use('/.rootz', this.createRoutes());
    
    // Serve client library (EPISTERY pattern)
    app.use('/.rootz/lib', express.static(path.join(__dirname, 'client')));
    
    console.log('✅ Platform attached successfully');
  }

  private domainResolutionMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Domain-aware configuration (EPISTERY pattern)
    const domain = req.hostname || 'localhost';
    
    // Load domain-specific configuration if needed
    req.app.locals.domain = domain;
    req.app.locals.config = this.config.loadDomain(domain);
    
    next();
  }

  private createRoutes(): express.Router {
    const router = express.Router();
    
    // Status endpoint (EPISTERY pattern)
    const statusController = new StatusController();
    router.get('/status', statusController.getStatus.bind(statusController));
    
    // Health check endpoint
    router.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
    });
    
    // Email Wallet routes
    const emailWalletController = new EmailWalletController();
    router.post('/email-wallet/register', emailWalletController.register.bind(emailWalletController));
    router.get('/email-wallet/balance/:address', emailWalletController.getBalance.bind(emailWalletController));
    
    // Email monitoring routes (NEW)
    router.post('/email-monitoring/start', emailWalletController.startEmailMonitoring.bind(emailWalletController));
    router.post('/email-monitoring/stop', emailWalletController.stopEmailMonitoring.bind(emailWalletController));
    router.get('/email-monitoring/status', emailWalletController.getEmailMonitoringStatus.bind(emailWalletController));
    router.post('/email-monitoring/test', emailWalletController.testEmailProcessing.bind(emailWalletController));

    // Wallet proposal routes (NEW)
    router.post('/email-wallet/propose', emailWalletController.createWalletProposal.bind(emailWalletController));
    router.post('/email-wallet/authorize', emailWalletController.authorizeWallet.bind(emailWalletController));
    router.get('/email-wallet/dashboard/:address', emailWalletController.getUserDashboard.bind(emailWalletController));
    
    // Test endpoints
    router.get('/test/blockchain-write', emailWalletController.testBlockchainWrite.bind(emailWalletController));

    // Client library serving (EPISTERY pattern)
    router.get('/lib/client.js', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.send(`
// SKS Rootz Platform Client Library
class RootzClient {
  constructor(baseUrl = window.location.origin) {
    this.baseUrl = baseUrl;
  }

  async checkUserRegistration(address) {
    const response = await fetch(\`\${this.baseUrl}/.rootz/email-wallet/balance/\${address}\`);
    return response.json();
  }

  async registerUser(userAddress, signature, message) {
    const response = await fetch(\`\${this.baseUrl}/.rootz/email-wallet/register\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress, signature, message })
    });
    return response.json();
  }

  async createWalletProposal(userAddress, emailSubject, senderName, senderAddress, attachmentCount = 0) {
    const response = await fetch(\`\${this.baseUrl}/.rootz/email-wallet/propose\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress, emailSubject, senderName, senderAddress, attachmentCount })
    });
    return response.json();
  }

  async getUserDashboard(address) {
    const response = await fetch(\`\${this.baseUrl}/.rootz/email-wallet/dashboard/\${address}\`);
    return response.json();
  }

  async startEmailMonitoring() {
    const response = await fetch(\`\${this.baseUrl}/.rootz/email-monitoring/start\`, {
      method: 'POST'
    });
    return response.json();
  }

  async getEmailMonitoringStatus() {
    const response = await fetch(\`\${this.baseUrl}/.rootz/email-monitoring/status\`);
    return response.json();
  }
}

// Make available globally
window.RootzClient = RootzClient;

// Auto-initialize
window.rootzClient = new RootzClient();
      `);
    });
    
    return router;
  }
}