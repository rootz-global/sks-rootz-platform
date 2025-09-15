// src/controllers/RegistrationTestController.ts
import { Request, Response } from 'express';
import { RegistrationLookupService } from '../services/RegistrationLookupService';

export class RegistrationTestController {
    private registrationService: RegistrationLookupService;

    constructor() {
        this.registrationService = new RegistrationLookupService();
    }

    /**
     * Test endpoint: Look up wallet by email
     * GET /.rootz/test/registration-lookup?email=steven@sprague.com
     */
    async lookupByEmail(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.query;

            if (!email || typeof email !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Email parameter required',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            console.log(`[TEST] Registration lookup for email: ${email}`);

            const walletAddress = await this.registrationService.getWalletByEmail(email);

            if (!walletAddress) {
                res.json({
                    success: false,
                    email: email,
                    wallet: null,
                    message: 'No wallet registered for this email',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Get full registration details
            const registration = await this.registrationService.getUserRegistration(walletAddress);

            res.json({
                success: true,
                email: email,
                wallet: walletAddress,
                registration: registration,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('[TEST] Registration lookup error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Test endpoint: Check user registration status
     * GET /.rootz/test/user-registration?address=0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b
     */
    async checkUserRegistration(req: Request, res: Response): Promise<void> {
        try {
            const { address } = req.query;

            if (!address || typeof address !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Address parameter required',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            console.log(`[TEST] User registration check for: ${address}`);

            const isRegistered = await this.registrationService.isUserRegistered(address);
            const registration = await this.registrationService.getUserRegistration(address);

            res.json({
                success: true,
                address: address,
                isRegistered: isRegistered,
                registration: registration,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('[TEST] User registration check error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Test endpoint: Validate email-wallet mapping
     * GET /.rootz/test/validate-mapping?email=steven@sprague.com&wallet=0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b
     */
    async validateMapping(req: Request, res: Response): Promise<void> {
        try {
            const { email, wallet } = req.query;

            if (!email || typeof email !== 'string' || !wallet || typeof wallet !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Email and wallet parameters required',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            console.log(`[TEST] Validating mapping: ${email} → ${wallet}`);

            const isValid = await this.registrationService.validateEmailWalletMapping(email, wallet);
            const actualWallet = await this.registrationService.getWalletByEmail(email);
            const registration = actualWallet ? await this.registrationService.getUserRegistration(actualWallet) : null;

            res.json({
                success: true,
                email: email,
                expectedWallet: wallet,
                actualWallet: actualWallet,
                isValidMapping: isValid,
                registration: registration,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('[TEST] Mapping validation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
    }
}
