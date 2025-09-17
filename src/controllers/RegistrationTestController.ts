// src/controllers/RegistrationTestController.ts
import { Request, Response } from 'express';
import { RegistrationLookupService } from '../services/RegistrationLookupService';
import { ConfigService } from '../services/ConfigService';
import { ethers } from 'ethers';

export class RegistrationTestController {
    private registrationService: RegistrationLookupService;
    private configService: ConfigService;
    private provider: ethers.providers.JsonRpcProvider;
    private serviceWallet: ethers.Wallet;

    constructor() {
        this.registrationService = new RegistrationLookupService();
        this.configService = new ConfigService('localhost');
        
        // Initialize blockchain connection for credit operations
        const rpcUrl = this.configService.get('blockchain.rpcUrl') || 'https://rpc-amoy.polygon.technology/';
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        
        const serviceWalletPrivateKey = this.configService.get('blockchain.serviceWalletPrivateKey');
        if (!serviceWalletPrivateKey) {
            console.error('❌ Service wallet private key not found in configuration');
            throw new Error('Service wallet private key required for credit operations');
        }
        
        this.serviceWallet = new ethers.Wallet(serviceWalletPrivateKey, this.provider);
        console.log(`💳 Credit service initialized with wallet: ${this.serviceWallet.address}`);
    }

    /**
     * Test endpoint: Grant credits to a wallet
     * POST /.rootz/test/grant-credits
     * Body: {"address": "0x30e1eA3dfDA0dD9694685B72Cde17E31c0f43e77", "amount": 60}
     */
    async grantCredits(req: Request, res: Response): Promise<void> {
        try {
            const { address, amount } = req.body;

            if (!address || typeof address !== 'string') {
                res.status(400).json({
                    success: false,
                    error: 'Address parameter required',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            const creditAmount = amount || 60; // Default 60 credits

            console.log(`[CREDIT] Granting ${creditAmount} credits to: ${address}`);

            // Get registration contract
            const registrationContractAddress = this.configService.get('blockchain.contractRegistration');
            const registrationAbi = [
                "function depositCredits(address wallet) payable",
                "function getCreditBalance(address wallet) view returns (uint256)"
            ];

            const registrationContract = new ethers.Contract(
                registrationContractAddress,
                registrationAbi,
                this.serviceWallet
            );

            // Calculate POL amount (1 credit = 0.0001 POL)
            const polAmount = ethers.utils.parseEther((creditAmount * 0.0001).toString());

            console.log(`[CREDIT] Depositing ${ethers.utils.formatEther(polAmount)} POL for ${creditAmount} credits`);

            // Call depositCredits with POL payment and proper gas pricing for Polygon
            const feeData = await this.provider.getFeeData();
            const gasPrice = feeData.gasPrice || ethers.utils.parseUnits('30', 'gwei'); // Minimum 30 Gwei for Polygon
            
            const tx = await registrationContract.depositCredits(address, {
                value: polAmount,
                gasLimit: 200000,
                gasPrice: gasPrice
            });

            console.log(`[CREDIT] Transaction submitted: ${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait();

            // Get updated credit balance
            const newBalance = await registrationContract.getCreditBalance(address);

            console.log(`[CREDIT] Transaction confirmed in block: ${receipt.blockNumber}`);
            console.log(`[CREDIT] New credit balance: ${newBalance.toString()}`);

            res.json({
                success: true,
                address: address,
                creditsGranted: creditAmount,
                polPaid: ethers.utils.formatEther(polAmount),
                newBalance: newBalance.toString(),
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('[CREDIT] Error granting credits:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Test endpoint: Check credit balance for a wallet
     * GET /.rootz/test/check-credits?address=0x30e1eA3dfDA0dD9694685B72Cde17E31c0f43e77
     */
    async checkCredits(req: Request, res: Response): Promise<void> {
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

            console.log(`[CREDIT] Checking credit balance for: ${address}`);

            // Get registration contract
            const registrationContractAddress = this.configService.get('blockchain.contractRegistration');
            const registrationAbi = [
                "function getCreditBalance(address wallet) view returns (uint256)",
                "function isRegistered(address wallet) view returns (bool)"
            ];

            const registrationContract = new ethers.Contract(
                registrationContractAddress,
                registrationAbi,
                this.provider // Read-only, no need for service wallet
            );

            // Check if user is registered first
            const isRegistered = await registrationContract.isRegistered(address);
            
            if (!isRegistered) {
                res.json({
                    success: false,
                    address: address,
                    isRegistered: false,
                    message: 'Wallet is not registered',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Get credit balance
            const balance = await registrationContract.getCreditBalance(address);
            const balanceNumber = balance.toString();

            console.log(`[CREDIT] Credit balance for ${address}: ${balanceNumber}`);

            // Determine if balance is suspiciously high (billion+ credits)
            const isSuspiciouslyHigh = balance.gt(ethers.BigNumber.from('1000000000')); // 1 billion
            const isZero = balance.eq(0);

            res.json({
                success: true,
                address: address,
                isRegistered: true,
                creditBalance: balanceNumber,
                balanceStatus: {
                    isZero: isZero,
                    isSuspiciouslyHigh: isSuspiciouslyHigh,
                    needsCredits: isZero,
                    sufficientForEmail: balance.gte(4) // Need 4 credits for email wallet
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('[CREDIT] Error checking credits:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            res.status(500).json({
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString()
            });
        }
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
