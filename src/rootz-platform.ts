// SKS Rootz Platform - Core Platform Class (EPISTERY Pattern)

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { Config } from './config/Config.js';
import { StatusController } from './controllers/StatusController.js';
import { EmailWalletController } from './controllers/EmailWalletController.js';

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
    router.get('/email-wallet/balance/:userAddress', emailWalletController.getCreditBalance.bind(emailWalletController));
    router.get('/email-wallet/credits/:userAddress', emailWalletController.getCreditBalance.bind(emailWalletController));
    
    // Test endpoints
    router.get('/test/blockchain-write', emailWalletController.testBlockchainWrite.bind(emailWalletController));
    
    return router;
  }
}
