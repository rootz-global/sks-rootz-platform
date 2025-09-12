// SKS Rootz Platform - Status Controller (EPISTERY Pattern)

import { Request, Response } from 'express';
import { Controller } from './Controller.js';

export class StatusController extends Controller {
  public async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const domain = req.app.locals.domain || 'unknown';
      const config = req.app.locals.config;
      
      const status = {
        service: 'SKS Rootz Platform',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        domain,
        services: {
          emailWallet: config?.services?.emailWallet || false,
          secretsManagement: config?.services?.secretsManagement || false,
          aiWallet: config?.services?.aiWallet || false
        },
        endpoints: {
          health: '/.rootz/health',
          status: '/.rootz/status',
          clientLibrary: '/.rootz/lib/rootz-client.js'
        }
      };

      this.sendResponse(res, status);
    } catch (error) {
      this.sendError(res, 'Failed to get service status', 500);
    }
  }
}
