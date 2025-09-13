// SKS Rootz Platform - Core Platform Class (EPISTERY Pattern)

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { Config } from './core/configuration/Config';
import { StatusController } from './controllers/StatusController';
import { EmailWalletController } from './controllers/EmailWalletController';
import { createEmailProcessingRoutes } from './routes/emailProcessingRoutes';
import testRoutes from './routes/testRoutes';
import EmailMonitoringController from './controllers/EmailMonitoringController';

// CORS middleware function
function enableCORS(req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
}

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
    
    // Load configuration for current domain (EPISTERY pattern)
    const domain = process.env.DOMAIN || 'localhost';
    this.config.loadDomain(domain);
    console.log(`✅ Loaded configuration for domain: ${domain}`);
    
    this.isInitialized = true;
    console.log('✅ Platform initialization complete');
  }

  public getConfig(): Config {
    return this.config;
  }

  // Attach to existing Express app (EPISTERY pattern)
  public async attach(app: express.Application): Promise<void> {
    console.log('🔗 Attaching SKS Rootz Platform to existing app...');
    
    // Add body parsing middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Domain resolution middleware (EPISTERY pattern)
    app.use(this.domainResolutionMiddleware.bind(this));
    
    // Attach platform routes under /.rootz/ (well-known path) with CORS
    app.use('/.rootz', enableCORS, this.createRoutes());
    
    // Serve client library (EPISTERY pattern)
    app.use('/.rootz/lib', express.static(path.join(__dirname, 'client')));
    
    console.log('✅ Platform attached successfully');
  }

  private domainResolutionMiddleware(req: Request, res: Response, next: NextFunction): void {
    // Domain-aware configuration (EPISTERY pattern)
    const domain = req.hostname || 'localhost';
    
    // Load domain-specific configuration if needed
    if (this.config.getCurrentDomain() !== domain) {
      this.config.loadDomain(domain);
    }
    
    req.app.locals.domain = domain;
    req.app.locals.config = this.config;
    
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
    
    // Legacy email monitoring routes REMOVED - using integrated monitoring instead
    // Old routes disabled to prevent conflicts with new integrated system

    // Wallet proposal routes (NEW)
    router.post('/email-wallet/propose', emailWalletController.createWalletProposal.bind(emailWalletController));
    router.post('/email-wallet/authorize', emailWalletController.authorizeWallet.bind(emailWalletController));
    router.get('/email-wallet/dashboard/:address', emailWalletController.getUserDashboard.bind(emailWalletController));
    
    // Test endpoints
    router.get('/test/blockchain-write', emailWalletController.testBlockchainWrite.bind(emailWalletController));

    // EMAIL MONITORING ROUTES (INTEGRATED) - Replaces old email monitoring
    console.log('📧 Initializing Integrated Email Monitoring routes...');
    const emailMonitoringController = new EmailMonitoringController(this.config);
    router.post('/email-monitoring/start', emailMonitoringController.startMonitoring.bind(emailMonitoringController));
    router.post('/email-monitoring/stop', emailMonitoringController.stopMonitoring.bind(emailMonitoringController));
    router.get('/email-monitoring/status', emailMonitoringController.getStatus.bind(emailMonitoringController));
    router.post('/email-monitoring/test', emailMonitoringController.testProcessing.bind(emailMonitoringController));
    router.get('/email-monitoring/health', emailMonitoringController.healthCheck.bind(emailMonitoringController));
    console.log('✅ Integrated Email Monitoring routes initialized');
    console.log('   Available at: /.rootz/email-monitoring/*');

    // EMAIL PROCESSING ROUTES (NEW) - Complete Email-to-Blockchain System
    console.log('🔧 Initializing Email Processing routes...');
    try {
      const emailProcessingRoutes = createEmailProcessingRoutes(this.config);
      router.use('/email-processing', emailProcessingRoutes);
      console.log('✅ Email Processing routes initialized');
      console.log('   Available at: /.rootz/email-processing/*');
    } catch (error) {
      console.error('❌ Failed to initialize Email Processing routes:', error);
    }

    // TEST ROUTES - DATA_WALLET Creation Testing
    console.log('🧪 Initializing Test routes...');
    router.use('/test', testRoutes);
    console.log('✅ Test routes initialized');
    console.log('   Available at: /.rootz/test/*');

    // Serve authorization page (static HTML)
    router.get('/authorization', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'authorization.html'));
    });
    
    // Serve static files for authorization interface
    router.use('/public', express.static(path.join(__dirname, '..', 'public')));

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

  // NEW: Email Processing Methods
  async processEmail(userAddress, rawEmail, notifyUser = true) {
    const response = await fetch(\`\${this.baseUrl}/.rootz/email-processing/process\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress, rawEmail, notifyUser })
    });
    return response.json();
  }

  async testEmailParsing(rawEmail) {
    const response = await fetch(\`\${this.baseUrl}/.rootz/email-processing/test-parse\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawEmail })
    });
    return response.json();
  }

  async getEmailProcessingHealth() {
    const response = await fetch(\`\${this.baseUrl}/.rootz/email-processing/health\`);
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
