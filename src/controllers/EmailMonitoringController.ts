import { Request, Response } from 'express';
import { Config } from '../core/configuration';
import IntegratedEmailMonitoringService from '../services/IntegratedEmailMonitoringService';
import { EnhancedAuthorizationService } from '../services/authorization/EnhancedAuthorizationService';

/**
 * Email Monitoring Controller - Unified Service
 * Replaces old email monitoring with integrated blockchain authorization flow
 */
export class EmailMonitoringController {
  private config: Config;
  private emailMonitoringService: IntegratedEmailMonitoringService;

  constructor(config: Config, sharedAuthService?: EnhancedAuthorizationService) {
    this.config = config;
    this.emailMonitoringService = new IntegratedEmailMonitoringService(config, sharedAuthService);
    console.log('🔧 Email Monitoring Controller initialized');
  }

  /**
   * Start integrated email monitoring
   * POST /.rootz/email-monitoring/start
   */
  async startMonitoring(req: Request, res: Response): Promise<void> {
    try {
      console.log('🚀 Starting integrated email monitoring...');
      
      await this.emailMonitoringService.startMonitoring();
      
      res.json({
        success: true,
        message: 'Integrated email monitoring started successfully',
        status: this.emailMonitoringService.getStatus(),
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Failed to start email monitoring:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to start email monitoring',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Stop email monitoring
   * POST /.rootz/email-monitoring/stop
   */
  async stopMonitoring(req: Request, res: Response): Promise<void> {
    try {
      console.log('🛑 Stopping email monitoring...');
      
      this.emailMonitoringService.stopMonitoring();
      
      res.json({
        success: true,
        message: 'Email monitoring stopped successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Failed to stop email monitoring:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to stop email monitoring',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get email monitoring status
   * GET /.rootz/email-monitoring/status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = this.emailMonitoringService.getStatus();
      
      res.json({
        success: true,
        data: {
          success: true,
          emailMonitoring: status
        },
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Failed to get monitoring status:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get monitoring status',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Test email processing
   * POST /.rootz/email-monitoring/test
   */
  async testProcessing(req: Request, res: Response): Promise<void> {
    try {
      console.log('🧪 Testing integrated email processing...');
      
      await this.emailMonitoringService.testEmailProcessing();
      
      res.json({
        success: true,
        message: 'Email processing test completed successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Email processing test failed:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Email processing test failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Health check
   * GET /.rootz/email-monitoring/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.emailMonitoringService.healthCheck();
      
      res.status(health.healthy ? 200 : 503).json({
        success: health.healthy,
        health,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Health check failed:', error);
      res.status(503).json({
        success: false,
        error: error?.message || 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export default EmailMonitoringController;
