import express, { Application, Request, Response } from 'express';
import { Config } from './config/Config';
import { StatusController } from './controllers/StatusController';
import { EmailWalletController } from './controllers/EmailWalletController';
import { GraphEmailMonitorService } from './services/GraphEmailMonitorService';

export class RootzPlatform {
  private app: Application;
  private config: any;
  private statusController: StatusController;
  private emailWalletController: EmailWalletController;
  private emailMonitorService: GraphEmailMonitorService;
  private domain: string;

  constructor(domain: string = 'localhost') {
    this.domain = domain;
    this.app = express();
    this.config = Config.loadDomain(domain);
    
    // Initialize controllers
    this.statusController = new StatusController(domain);
    this.emailWalletController = new EmailWalletController(domain);
    this.emailMonitorService = new GraphEmailMonitorService(domain);
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Basic middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS for API access
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`📡 ${req.method} ${req.path} - ${req.ip}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Platform status routes
    this.app.get('/.rootz/status', (req, res) => this.statusController.getStatus(req, res));
    this.app.get('/.rootz/health', (req, res) => this.statusController.getHealth(req, res));

    // Email Wallet routes
    this.app.post('/.rootz/email-wallet/register', (req, res) => 
      this.emailWalletController.register(req, res));
    
    this.app.get('/.rootz/email-wallet/balance/:address', (req, res) => 
      this.emailWalletController.getBalance(req, res));
    
    this.app.get('/.rootz/email-wallet/dashboard/:address', (req, res) => 
      this.emailWalletController.getUserDashboard(req, res));

    // Email monitoring routes (NEW)
    this.app.post('/.rootz/email-monitoring/start', (req, res) => 
      this.emailWalletController.startEmailMonitoring(req, res));
    
    this.app.post('/.rootz/email-monitoring/stop', (req, res) => 
      this.emailWalletController.stopEmailMonitoring(req, res));
    
    this.app.get('/.rootz/email-monitoring/status', (req, res) => 
      this.emailWalletController.getEmailMonitoringStatus(req, res));
    
    this.app.post('/.rootz/email-monitoring/test', (req, res) => 
      this.emailWalletController.testEmailProcessing(req, res));

    // Wallet proposal routes (NEW)
    this.app.post('/.rootz/email-wallet/propose', (req, res) => 
      this.emailWalletController.createWalletProposal(req, res));
    
    this.app.post('/.rootz/email-wallet/authorize', (req, res) => 
      this.emailWalletController.authorizeWallet(req, res));

    // Test routes
    this.app.get('/.rootz/test/blockchain-write', async (req, res) => {
      try {
        // Test basic blockchain write capability
        const result = await this.emailWalletController.testBlockchainWrite(req, res);
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Blockchain write test failed',
          error: error.message
        });
      }
    });

    // Client library serving (EPISTERY pattern)
    this.app.get('/.rootz/lib/client.js', (req, res) => {
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

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        platform: 'SKS Rootz Platform',
        version: this.config.platform?.version || '1.0.0',
        environment: this.config.platform?.environment || 'development',
        endpoints: {
          status: '/.rootz/status',
          health: '/.rootz/health',
          clientLibrary: '/.rootz/lib/client.js',
          emailWallet: {
            register: 'POST /.rootz/email-wallet/register',
            balance: 'GET /.rootz/email-wallet/balance/:address',
            dashboard: 'GET /.rootz/email-wallet/dashboard/:address',
            propose: 'POST /.rootz/email-wallet/propose',
            authorize: 'POST /.rootz/email-wallet/authorize'
          },
          emailMonitoring: {
            start: 'POST /.rootz/email-monitoring/start',
            stop: 'POST /.rootz/email-monitoring/stop',
            status: 'GET /.rootz/email-monitoring/status',
            test: 'POST /.rootz/email-monitoring/test'
          }
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
        availableEndpoints: '/.rootz/status for platform information'
      });
    });
  }

  public async initialize(): Promise<void> {
    console.log('🔧 Initializing SKS Rootz Platform...');
    
    // Validate configuration
    if (!this.config) {
      throw new Error('Configuration not loaded. Check ~/.data-wallet/localhost/config.ini');
    }

    // Auto-start email monitoring if configured
    if (this.config.email?.microsoftGraph?.enabled && this.config.services?.emailWallet) {
      console.log('📧 Auto-starting email monitoring service...');
      try {
        await this.emailMonitorService.startMonitoring();
        console.log('✅ Email monitoring started automatically');
      } catch (error) {
        console.error('⚠️ Failed to auto-start email monitoring:', error.message);
        console.log('💡 You can start it manually via /.rootz/email-monitoring/start');
      }
    }

    console.log('✅ Platform initialization complete');
  }

  public listen(port: number = 3000): void {
    this.app.listen(port, () => {
      console.log(`🚀 SKS Rootz Platform listening on port ${port}`);
      console.log(`📍 Platform status: http://localhost:${port}/.rootz/status`);
      console.log(`🔍 Health check: http://localhost:${port}/.rootz/health`);
      console.log(`📧 Email monitoring: http://localhost:${port}/.rootz/email-monitoring/status`);
    });
  }

  public getApp(): Application {
    return this.app;
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down platform...');
    
    // Stop email monitoring
    if (this.emailMonitorService) {
      this.emailMonitorService.stopMonitoring();
    }
    
    console.log('✅ Platform shutdown complete');
  }
}