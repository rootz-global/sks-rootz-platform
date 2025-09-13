import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { Config } from '../config/Config';
import { BlockchainService } from './BlockchainService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface EmailData {
  id: string;
  subject: string;
  sender: {
    name: string;
    address: string;
  };
  receivedDateTime: string;
  bodyPreview: string;
  hasAttachments: boolean;
  attachmentCount: number;
  attachments?: any[];
}

interface ProcessedEmail {
  emailData: EmailData;
  recipientAddress: string;
  emailHash: string;
  attachmentHashes: string[];
  creditCost: number;
  proposalId: string;
}

export class GraphEmailMonitorService {
  private graphClient: Client | null = null;
  private config: any;
  private blockchainService: BlockchainService | null = null;
  private isRunning: boolean = false;
  private monitoringInterval: NodeJS.Timer | null = null;
  private lastProcessedTime: Date;

  constructor(domain: string = 'localhost') {
    this.config = this.loadEpisteryConfig(domain);
    this.lastProcessedTime = new Date(Date.now() - 60000); // Start 1 minute ago
    
    try {
      this.initializeGraphClient();
      this.blockchainService = new BlockchainService(this.config);
    } catch (error) {
      console.warn('⚠️ Failed to initialize Graph client or blockchain service:', error);
    }
  }

  private loadEpisteryConfig(domain: string): any {
    try {
      // Load EPISTERY configuration from ~/.data-wallet/domain/config.ini
      const configDir = path.join(os.homedir(), '.data-wallet', domain);
      const configFile = path.join(configDir, 'config.ini');
      
      console.log(`📁 Loading EPISTERY config from: ${configFile}`);
      
      if (!fs.existsSync(configFile)) {
        console.warn(`⚠️ Configuration file not found: ${configFile}`);
        return this.getDefaultConfig();
      }

      const configContent = fs.readFileSync(configFile, 'utf8');
      const config = this.parseIniConfig(configContent);
      
      console.log(`📧 Email config loaded - enabled: ${config.email?.microsoftGraph?.enabled}`);
      return config;
    } catch (error) {
      console.error('❌ Failed to load EPISTERY config:', error);
      return this.getDefaultConfig();
    }
  }

  private parseIniConfig(content: string): any {
    const config: any = {};
    let currentSection = '';
    let currentSubsection = '';

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
        continue;
      }

      // Handle sections like [email] or [email.microsoftGraph]
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const sectionName = trimmed.slice(1, -1);
        
        if (sectionName.includes('.')) {
          const parts = sectionName.split('.');
          currentSection = parts[0];
          currentSubsection = parts[1];
          
          if (!config[currentSection]) {
            config[currentSection] = {};
          }
          if (!config[currentSection][currentSubsection]) {
            config[currentSection][currentSubsection] = {};
          }
        } else {
          currentSection = sectionName;
          currentSubsection = '';
          if (!config[currentSection]) {
            config[currentSection] = {};
          }
        }
        continue;
      }

      // Handle key=value pairs
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        let value: any = trimmed.substring(equalIndex + 1).trim();

        // Convert boolean strings
        if (value.toLowerCase() === 'true') value = true;
        else if (value.toLowerCase() === 'false') value = false;
        // Convert numbers
        else if (!isNaN(Number(value)) && value !== '') value = Number(value);

        if (currentSection && currentSubsection) {
          config[currentSection][currentSubsection][key] = value;
        } else if (currentSection) {
          config[currentSection][key] = value;
        }
      }
    }

    return config;
  }

  private getDefaultConfig(): any {
    return {
      email: {
        microsoftGraph: {
          enabled: false,
          tenantId: '',
          clientId: '',
          clientSecret: '',
          userPrincipalName: 'process@rivetz.com',
          pollIntervalMinutes: 1
        }
      },
      blockchain: {
        rpcUrl: 'https://rpc-amoy.polygon.technology/',
        serviceWalletPrivateKey: process.env.SERVICE_WALLET_PRIVATE_KEY || '',
        contracts: {
          registration: '0x71C1d6a0DAB73b25dE970E032bafD42a29dC010F'
        }
      }
    };
  }

  private initializeGraphClient(): void {
    console.log('🔧 Initializing Microsoft Graph client...');
    
    if (!this.config.email?.microsoftGraph?.enabled) {
      console.log('📧 Microsoft Graph integration disabled in configuration');
      return;
    }

    try {
      console.log(`📧 Attempting to connect with tenant: ${this.config.email.microsoftGraph.tenantId}`);
      
      const clientSecretCredential = new ClientSecretCredential(
        this.config.email.microsoftGraph.tenantId,
        this.config.email.microsoftGraph.clientId,
        this.config.email.microsoftGraph.clientSecret
      );

      this.graphClient = Client.initWithMiddleware({
        authProvider: {
          getAccessToken: async () => {
            try {
              const token = await clientSecretCredential.getToken('https://graph.microsoft.com/.default');
              console.log('🔑 Graph API token acquired successfully');
              return token?.token || '';
            } catch (error) {
              console.error('❌ Failed to get Graph API token:', error);
              throw error;
            }
          }
        }
      });

      console.log('✅ Microsoft Graph client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Graph client:', error);
      this.graphClient = null;
    }
  }

  public async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Email monitoring already running');
      return;
    }

    if (!this.graphClient) {
      throw new Error('Microsoft Graph client not available. Check configuration.');
    }

    console.log('🚀 Starting email monitoring service...');
    
    // Test connection first
    await this.testConnection();
    
    this.isRunning = true;
    const pollInterval = this.config.email?.microsoftGraph?.pollIntervalMinutes || 1;
    
    console.log(`📧 Monitoring emails every ${pollInterval} minute(s)`);
    
    // Initial check
    await this.checkForNewEmails();
    
    // Set up recurring monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkForNewEmails();
      } catch (error) {
        console.error('❌ Error during email monitoring cycle:', error);
      }
    }, pollInterval * 60 * 1000);
  }

  public stopMonitoring(): void {
    console.log('🛑 Stopping email monitoring service...');
    
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('✅ Email monitoring stopped');
  }

  private async testConnection(): Promise<void> {
    try {
      if (!this.graphClient) {
        throw new Error('Graph client not initialized');
      }

      console.log('🔍 Testing Microsoft Graph connection...');
      
      const userPrincipalName = this.config.email?.microsoftGraph?.userPrincipalName;
      console.log(`📧 Testing connection for user: ${userPrincipalName}`);
      
      const user = await this.graphClient.api(`/users/${userPrincipalName}`).get();
      
      console.log(`✅ Connected to Microsoft Graph for user: ${user.displayName} (${user.mail})`);
    } catch (error) {
      console.error('❌ Microsoft Graph connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      throw new Error(`Graph API connection failed: ${errorMessage}`);
    }
  }

  private async checkForNewEmails(): Promise<void> {
    try {
      if (!this.graphClient) {
        console.warn('⚠️ Graph client not available');
        return;
      }

      const userPrincipalName = this.config.email?.microsoftGraph?.userPrincipalName;
      const filterDate = this.lastProcessedTime.toISOString();
      
      console.log(`📬 Checking for emails received after ${filterDate}`);
      
      // Query for unread emails received after last check
      const messages = await this.graphClient
        .api(`/users/${userPrincipalName}/messages`)
        .filter(`receivedDateTime gt ${filterDate} and isRead eq false`)
        .select('id,subject,sender,receivedDateTime,bodyPreview,hasAttachments')
        .orderby('receivedDateTime desc')
        .top(50)
        .get();

      if (messages.value && messages.value.length > 0) {
        console.log(`📨 Found ${messages.value.length} new email(s) to process`);
        
        for (const message of messages.value) {
          await this.processNewEmail(message);
        }
        
        // Update last processed time
        this.lastProcessedTime = new Date();
      } else {
        console.log('📭 No new emails found');
      }
    } catch (error) {
      console.error('❌ Error checking for new emails:', error);
      throw error;
    }
  }

  private async processNewEmail(message: any): Promise<void> {
    try {
      console.log(`📝 Processing email: "${message.subject}" from ${message.sender?.emailAddress?.address}`);
      
      // Convert Graph API message to our EmailData format
      const emailData: EmailData = {
        id: message.id,
        subject: message.subject || 'No Subject',
        sender: {
          name: message.sender?.emailAddress?.name || 'Unknown',
          address: message.sender?.emailAddress?.address || 'unknown@unknown.com'
        },
        receivedDateTime: message.receivedDateTime,
        bodyPreview: message.bodyPreview || '',
        hasAttachments: message.hasAttachments || false,
        attachmentCount: 0, // Will be updated if we fetch attachments
        attachments: []
      };

      // Fetch attachments if present
      if (emailData.hasAttachments) {
        emailData.attachments = await this.fetchEmailAttachments(message.id);
        emailData.attachmentCount = emailData.attachments?.length || 0;
      }

      // Find recipient user based on email routing rules
      const recipientAddress = await this.determineRecipientWallet(emailData);
      
      if (!recipientAddress) {
        console.log(`⚠️ No recipient wallet found for email from ${emailData.sender.address}`);
        await this.markEmailAsRead(message.id);
        return;
      }

      // Check if user is registered
      if (this.blockchainService) {
        const isRegistered = await this.blockchainService.isUserRegistered(recipientAddress);
        if (!isRegistered) {
          console.log(`⚠️ Recipient ${recipientAddress} is not registered. Skipping email.`);
          await this.markEmailAsRead(message.id);
          return;
        }
      }

      // Process email for wallet creation proposal
      const processedEmail = await this.createWalletProposal(emailData, recipientAddress);
      
      // Send notification to user
      await this.sendWalletCreationNotification(processedEmail);
      
      // Mark email as read
      await this.markEmailAsRead(message.id);
      
      console.log(`✅ Email processed successfully. Proposal ID: ${processedEmail.proposalId}`);
      
    } catch (error) {
      console.error(`❌ Error processing email ${message.id}:`, error);
      // Mark as read even on error to prevent reprocessing
      await this.markEmailAsRead(message.id);
    }
  }

  private async fetchEmailAttachments(messageId: string): Promise<any[]> {
    try {
      if (!this.graphClient) {
        return [];
      }

      const userPrincipalName = this.config.email?.microsoftGraph?.userPrincipalName;
      const attachments = await this.graphClient
        .api(`/users/${userPrincipalName}/messages/${messageId}/attachments`)
        .get();

      return attachments.value || [];
    } catch (error) {
      console.error(`❌ Error fetching attachments for message ${messageId}:`, error);
      return [];
    }
  }

  private async determineRecipientWallet(emailData: EmailData): Promise<string | null> {
    // Implementation depends on your routing logic
    // For now, return a test wallet address if sender is known
    const knownSenders: { [key: string]: string } = {
      'steven@sprague.com': '0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b',
      'demo@techcorp.com': '0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b'
    };

    return knownSenders[emailData.sender.address] || null;
  }

  private async createWalletProposal(emailData: EmailData, recipientAddress: string): Promise<ProcessedEmail> {
    // Calculate credit cost based on email content
    const baseCost = 3; // Base email wallet cost
    const attachmentCost = emailData.attachmentCount * 2; // 2 credits per attachment
    const creditCost = baseCost + attachmentCost;

    // Generate hashes for blockchain verification
    const emailHash = this.generateEmailHash(emailData);
    const attachmentHashes = emailData.attachments?.map(att => this.generateAttachmentHash(att)) || [];

    // Create unique proposal ID
    const proposalId = `email-${Date.now()}-${emailData.id.substring(0, 8)}`;

    const processedEmail: ProcessedEmail = {
      emailData,
      recipientAddress,
      emailHash,
      attachmentHashes,
      creditCost,
      proposalId
    };

    console.log(`💰 Wallet creation proposal: ${creditCost} credits for email with ${emailData.attachmentCount} attachments`);

    return processedEmail;
  }

  private generateEmailHash(emailData: EmailData): string {
    // Create a hash of email content for blockchain verification
    const content = `${emailData.subject}|${emailData.sender.address}|${emailData.receivedDateTime}|${emailData.bodyPreview}`;
    return `0x${Buffer.from(content).toString('hex').padStart(64, '0').substring(0, 64)}`;
  }

  private generateAttachmentHash(attachment: any): string {
    // Create a hash of attachment for blockchain verification
    const content = `${attachment.name}|${attachment.size}|${attachment.contentType}`;
    return `0x${Buffer.from(content).toString('hex').padStart(64, '0').substring(0, 64)}`;
  }

  private async sendWalletCreationNotification(processedEmail: ProcessedEmail): Promise<void> {
    // TODO: Implement email notification to user
    console.log(`📧 [NOTIFICATION] Wallet creation proposal sent to ${processedEmail.recipientAddress}`);
    console.log(`   Subject: Create wallet for email from ${processedEmail.emailData.sender.name}`);
    console.log(`   Cost: ${processedEmail.creditCost} credits`);
    console.log(`   Proposal ID: ${processedEmail.proposalId}`);
  }

  private async markEmailAsRead(messageId: string): Promise<void> {
    try {
      if (!this.graphClient) {
        return;
      }

      const userPrincipalName = this.config.email?.microsoftGraph?.userPrincipalName;
      await this.graphClient
        .api(`/users/${userPrincipalName}/messages/${messageId}`)
        .patch({ isRead: true });
      
      console.log(`✅ Marked email ${messageId} as read`);
    } catch (error) {
      console.error(`❌ Error marking email ${messageId} as read:`, error);
    }
  }

  // Test method for manual email processing
  public async testEmailProcessing(): Promise<void> {
    console.log('🧪 Testing email processing with mock data...');
    
    const mockEmail: EmailData = {
      id: 'test-email-123',
      subject: 'Test Email for Wallet Creation',
      sender: {
        name: 'Steven Sprague',
        address: 'steven@sprague.com'
      },
      receivedDateTime: new Date().toISOString(),
      bodyPreview: 'This is a test email for wallet creation',
      hasAttachments: false,
      attachmentCount: 0,
      attachments: []
    };

    const recipientAddress = '0x107C5655ce50AB9744Fc36A4e9935E30d4923d0b';
    const processedEmail = await this.createWalletProposal(mockEmail, recipientAddress);
    
    console.log('✅ Test email processing complete:', processedEmail);
  }

  // Status method for monitoring
  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      lastProcessedTime: this.lastProcessedTime,
      graphClientAvailable: !!this.graphClient,
      blockchainServiceAvailable: !!this.blockchainService,
      config: {
        userPrincipalName: this.config.email?.microsoftGraph?.userPrincipalName,
        pollInterval: this.config.email?.microsoftGraph?.pollIntervalMinutes,
        enabled: this.config.email?.microsoftGraph?.enabled
      }
    };
  }
}