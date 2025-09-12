// SKS Rootz Platform - Base Controller (EPISTERY Pattern)

import { Request, Response } from 'express';

export abstract class Controller {
  protected sendResponse(res: Response, data: any, statusCode: number = 200): void {
    res.status(statusCode).json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  }

  protected sendError(res: Response, message: string, statusCode: number = 500): void {
    res.status(statusCode).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  protected getDomainFromRequest(req: Request): string {
    return req.hostname || req.get('host') || 'localhost';
  }

  protected getConfigFromRequest(req: Request): any {
    return req.app.locals.config;
  }
}
