import { Config } from '../core/configuration';
import EmailProcessingController from '../controllers/EmailProcessingController';

/**
 * Integrated Email Monitoring Service
 * Replaces old email monitoring with proper blockchain authorization flow
 */
export class IntegratedEmailMonitoringService {
  private config: Config;
  private emailController: EmailProcessingController;
  private isRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastProcessedTime: Date = new Date();
  private graphClient: any = null;

  constructor(config: Config) {
    this.config = config;
    this.emailController = new EmailProcessingController(config);
    
    this.initializeGraphClient();
    console.log('🔧 Integrated Email Monitoring Service initialized');
  }

  /**
   * Initialize Microsoft Graph client
   */
  private async initializeGraphClient() {
    try {
      console.log('🔧 Initializing Microsoft Graph client...');
      
      // Check if packages are available
      let msal, GraphServiceClient;
      try {
        msal = require('@azure/msal-node');
        const graphClient = require('@microsoft/microsoft-graph-client');
        GraphServiceClient = graphClient.GraphServiceClient;
      } catch (error) {
        console.error('❌ Microsoft Graph packages not installed:', error.message);
        console.log('💡 Run: npm install @azure/msal-node @microsoft/microsoft-graph-client');
        return false;
      }

      const clientConfig = {
        auth: {
          clientId: this.config.get('email.microsoftGraph.clientId'),
          clientSecret: this.config.get('email.microsoftGraph.clientSecret'),
          authority: `https://login.microsoftonline.com/${this.config.get('email.microsoftGraph.tenantId')}`
        }
      };

      const clientCredentialRequest = {
        scopes: ['https://graph.microsoft.com/.default'],
      };

      const cca = new msal.ConfidentialClientApplication(clientConfig);
      
      // Get access token
      const response = await cca.acquireTokenByClientCredential(clientCredentialRequest);
      
      if (response && response.accessToken) {
        this.graphClient = GraphServiceClient.init({
          authProvider: (done: any) => {
            done(null, response.accessToken);
          }
        });

        console.log('✅ Microsoft Graph client initialized successfully');
        console.log(`   User: ${this.config.get('email.microsoftGraph.userPrincipalName')}`);
        return true;
      } else {
        throw new Error('Failed to acquire access token');
      }

    } catch (error) {
      console.error('❌ Failed to initialize Microsoft Graph client:', error);
      console.log('📧 Email monitoring will not work without Microsoft Graph');
      return false;
    }
  }

  /**
   * Start email monitoring with proper blockchain authorization flow
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Email monitoring is already running');
      return;
    }

    if (!this.graphClient) {
      console.log('🔄 Reinitializing Graph client...');
      const success = await this.initializeGraphClient();
      if (!success) {
        throw new Error('Failed to initialize Microsoft Graph client');
      }
    }

    this.isRunning = true;
    const pollInterval = Number(this.config.get('email.microsoftGraph.pollIntervalMinutes')) || 1;
    
    console.log('🚀 Starting integrated email monitoring...');
    console.log(`📧 Monitoring emails every ${pollInterval} minute(s)`);
    console.log(`📬 Checking for emails received after ${this.lastProcessedTime.toISOString()}`);

    this.pollingInterval = setInterval(async () => {
      await this.checkForNewEmails();
    }, pollInterval * 60 * 1000);

    // Run initial check
    await this.checkForNewEmails();
  }

  /**
   * Stop email monitoring
   */
  stopMonitoring(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Email monitoring stopped');
  }

  /**
   * Check for new emails and process through proper authorization flow
   */
  private async checkForNewEmails(): Promise<void> {
    try {
      if (!this.graphClient) {
        console.error('❌ Graph client not available');
        return;
      }

      const userPrincipalName = this.config.get('email.microsoftGraph.userPrincipalName');
      
      // Get unread emails
      const messages = await this.graphClient
        .users(userPrincipalName)
        .messages
        .get({
          $filter: `isRead eq false and receivedDateTime gt ${this.lastProcessedTime.toISOString()}`,
          $orderby: 'receivedDateTime desc',
          $top: 10
        });

      if (messages && messages.value && messages.value.length > 0) {
        console.log(`📨 Found ${messages.value.length} new email(s) to process`);

        for (const message of messages.value) {
          await this.processEmailMessage(message);
        }

        this.lastProcessedTime = new Date();
      }

    } catch (error) {
      console.error('❌ Error checking for emails:', error);
    }
  }

  /**
   * Process individual email through proper authorization flow
   */
  private async processEmailMessage(message: any): Promise<void> {
    try {
      console.log(`📝 Processing email: "${message.subject}" from ${message.sender?.emailAddress?.address}`);

      // Extract user address from email body or use a registry lookup
      const userAddress = this.extractUserAddress(message);
      
      if (!userAddress) {
        console.log('⚠️ No user address found in email, skipping');
        return;
      }

      // Construct raw email content
      const rawEmail = this.constructRawEmail(message);

      // Process through proper authorization flow
      const mockReq = {
        body: {
          userAddress,
          rawEmail,
          notifyUser: true
        }
      };

      const mockRes = {
        status: (code: number) => mockRes,
        json: (data: any) => {
          if (data.success) {
            console.log(`✅ Authorization request created: ${data.requestId}`);
            console.log(`🔗 Authorization URL: ${data.authorizationUrl}`);
            console.log(`📤 IPFS Hash: ${data.ipfsHash}`);
          } else {
            console.error(`❌ Failed to process email: ${data.error}`);
          }
          return mockRes;
        }
      };

      // Call the proper email processing controller
      await this.emailController.processEmail(mockReq as any, mockRes as any);

      // Mark email as read
      await this.markEmailAsRead(message.id);

    } catch (error) {
      console.error(`❌ Error processing email ${message.id}:`, error);
    }
  }

  /**
   * Extract user wallet address from email content
   */
  private extractUserAddress(message: any): string | null {
    try {
      // Check email body for wallet address
      const bodyText = message.body?.content || '';
      const addressMatch = bodyText.match(/0x[a-fA-F0-9]{40}/);
      
      if (addressMatch) {
        return addressMatch[0];
      }

      // Check subject line
      const subjectMatch = message.subject?.match(/0x[a-fA-F0-9]{40}/);
      if (subjectMatch) {
        return subjectMatch[0];
      }

      // TODO: Could also look up sender email in registration database
      console.log('⚠️ No wallet address found in email content');
      return null;

    } catch (error) {
      console.error('Error extracting user address:', error);
      return null;
    }
  }

  /**
   * Construct raw email format for processing
   */
  private constructRawEmail(message: any): string {
    const from = message.sender?.emailAddress?.address || 'unknown@example.com';
    const to = message.toRecipients?.[0]?.emailAddress?.address || 'process@rivetz.com';
    const subject = message.subject || 'No Subject';
    const date = message.receivedDateTime || new Date().toISOString();
    const body = message.body?.content || '';

    return `From: ${from}
To: ${to}
Subject: ${subject}
Date: ${new Date(date).toUTCString()}

${body}`;
  }

  /**
   * Mark email as read in Microsoft Graph
   */
  private async markEmailAsRead(messageId: string): Promise<void> {
    try {
      const userPrincipalName = this.config.get('email.microsoftGraph.userPrincipalName');
      
      await this.graphClient
        .users(userPrincipalName)
        .messages(messageId)
        .patch({
          isRead: true
        });

      console.log(`✅ Marked email ${messageId} as read`);

    } catch (error) {
      console.error(`❌ Failed to mark email as read:`, error);
    }
  }

  /**
   * Test email processing manually
   */
  async testEmailProcessing(): Promise<void> {
    console.log('🧪 Testing email processing...');
    await this.checkForNewEmails();
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastProcessedTime: this.lastProcessedTime.toISOString(),
      graphClientAvailable: !!this.graphClient,
      config: {
        userPrincipalName: this.config.get('email.microsoftGraph.userPrincipalName'),
        pollInterval: Number(this.config.get('email.microsoftGraph.pollIntervalMinutes')) || 1,
        enabled: true // Always enabled for now
      }
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.graphClient) {
        return {
          healthy: false,
          error: 'Microsoft Graph client not initialized'
        };
      }

      const userPrincipalName = this.config.get('email.microsoftGraph.userPrincipalName');
      
      // Test Graph API connection
      await this.graphClient
        .users(userPrincipalName)
        .get();

      return {
        healthy: true,
        status: 'Microsoft Graph connection successful',
        isMonitoring: this.isRunning
      };

    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }
}

export default IntegratedEmailMonitoringService;
