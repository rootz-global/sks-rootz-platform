import crypto from 'crypto';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';

export interface ParsedEmailData {
  messageId: string;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  bodyText: string;
  bodyHtml: string;
  headers: { [key: string]: string };
  attachments: EmailAttachment[];
  
  // Computed hashes
  bodyHash: string;
  emailHash: string;
  emailHeadersHash: string;
  
  // Authentication results
  authentication: EmailAuthentication;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
  contentHash: string;
  contentId?: string;
  disposition?: string;
}

export interface EmailAuthentication {
  spfPass: boolean;
  dkimValid: boolean;
  dmarcPass: boolean;
  dkimSignature?: string;
  receivedChain: string[];
}

export class EmailParser {
  
  /**
   * Parse raw email content into structured data
   */
  async parseEmail(rawEmail: string): Promise<ParsedEmailData> {
    try {
      const parsed = await simpleParser(rawEmail);
      const processedEmail = this.processEmailData(parsed, rawEmail);
      return processedEmail;
    } catch (error: any) {
      throw new Error(`Email parsing failed: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Process parsed email data and calculate hashes
   */
  private processEmailData(parsed: ParsedMail, rawEmail: string): ParsedEmailData {
    // Extract basic email data
    const messageId = parsed.messageId || this.generateMessageId(parsed);
    const subject = parsed.subject || 'No Subject';
    const from = this.extractFromAddress(parsed);
    const to = this.extractToAddresses(parsed);
    const date = parsed.date || new Date();
    const bodyText = parsed.text || '';
    const bodyHtml = parsed.html || '';
    
    // Process headers
    const headers = this.extractHeaders(parsed);
    
    // Process attachments
    const attachments = this.processAttachments(parsed.attachments || []);
    
    // Calculate content hashes
    const bodyHash = this.calculateHash(bodyText + bodyHtml);
    const emailHash = this.calculateEmailHash(messageId, from, subject, bodyText);
    const emailHeadersHash = this.calculateHash(JSON.stringify(headers, Object.keys(headers).sort()));
    
    // Extract authentication data
    const authentication = this.extractAuthentication(parsed, rawEmail);
    
    return {
      messageId,
      subject,
      from,
      to,
      date,
      bodyText,
      bodyHtml,
      headers,
      attachments,
      bodyHash,
      emailHash,
      emailHeadersHash,
      authentication
    };
  }
  
  /**
   * Extract from address handling various formats
   */
  private extractFromAddress(parsed: ParsedMail): string {
    if (parsed.from?.value && parsed.from.value.length > 0) {
      return parsed.from.value[0].address || 'unknown@unknown.com';
    }
    if (parsed.from?.text) {
      return parsed.from.text;
    }
    return 'unknown@unknown.com';
  }
  
  /**
   * Extract to addresses
   */
  private extractToAddresses(parsed: ParsedMail): string[] {
    const addresses: string[] = [];
    
    // Handle both single AddressObject and array formats
    if (parsed.to) {
      const toAddresses = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
      for (const toAddr of toAddresses) {
        if (toAddr.value) {
          addresses.push(...toAddr.value.map(addr => addr.address || addr.name || 'unknown'));
        }
      }
    }
    
    if (parsed.cc) {
      const ccAddresses = Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc];
      for (const ccAddr of ccAddresses) {
        if (ccAddr.value) {
          addresses.push(...ccAddr.value.map(addr => addr.address || addr.name || 'unknown'));
        }
      }
    }
    
    return addresses.length > 0 ? addresses : ['unknown@unknown.com'];
  }
  
  /**
   * Extract and normalize headers
   */
  private extractHeaders(parsed: ParsedMail): { [key: string]: string } {
    const headers: { [key: string]: string } = {};
    
    if (parsed.headers) {
      for (const [key, value] of parsed.headers.entries()) {
        headers[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
      }
    }
    
    return headers;
  }
  
  /**
   * Process email attachments
   */
  private processAttachments(attachments: Attachment[]): EmailAttachment[] {
    return attachments.map(attachment => ({
      filename: attachment.filename || 'unknown',
      contentType: attachment.contentType || 'application/octet-stream',
      size: attachment.size || 0,
      content: attachment.content,
      contentHash: this.calculateHash(attachment.content),
      contentId: attachment.contentId,
      disposition: attachment.contentDisposition
    }));
  }
  
  /**
   * Extract email authentication results
   */
  private extractAuthentication(parsed: ParsedMail, rawEmail: string): EmailAuthentication {
    const headers = parsed.headers || new Map();
    
    // Extract authentication-related headers
    const receivedSpf = headers.get('received-spf') as string;
    const authResults = headers.get('authentication-results') as string;
    const dkimSignature = headers.get('dkim-signature') as string;
    const received = headers.get('received') as string | string[];
    
    // Parse SPF results
    const spfPass = receivedSpf ? 
      receivedSpf.toLowerCase().includes('pass') : false;
    
    // Parse DKIM results
    const dkimValid = authResults ? 
      authResults.toLowerCase().includes('dkim=pass') : false;
    
    // Parse DMARC results
    const dmarcPass = authResults ? 
      authResults.toLowerCase().includes('dmarc=pass') : false;
    
    // Extract received chain
    const receivedChain = Array.isArray(received) ? received : [received || ''];
    
    return {
      spfPass,
      dkimValid,
      dmarcPass,
      dkimSignature,
      receivedChain: receivedChain.filter(Boolean)
    };
  }
  
  /**
   * Calculate SHA-256 hash of content
   */
  private calculateHash(content: string | Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  /**
   * Calculate unique email hash from key components
   */
  private calculateEmailHash(messageId: string, from: string, subject: string, body: string): string {
    const emailKey = `${messageId}|${from}|${subject}|${body.substring(0, 1000)}`;
    return this.calculateHash(emailKey);
  }
  
  /**
   * Generate message ID if missing
   */
  private generateMessageId(parsed: ParsedMail): string {
    const timestamp = (parsed.date || new Date()).getTime();
    const fromHash = this.calculateHash(parsed.from?.text || 'unknown');
    return `generated.${timestamp}.${fromHash.substring(0, 8)}@rootz.global`;
  }
  
  /**
   * Validate email structure
   */
  validateEmailData(emailData: ParsedEmailData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!emailData.messageId) errors.push('Missing message ID');
    if (!emailData.from || emailData.from === 'unknown@unknown.com') errors.push('Invalid from address');
    if (!emailData.subject && !emailData.bodyText && !emailData.bodyHtml) errors.push('Empty email content');
    if (!emailData.bodyHash) errors.push('Missing body hash');
    if (!emailData.emailHash) errors.push('Missing email hash');
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Create email summary for logging/display
   */
  createEmailSummary(emailData: ParsedEmailData): string {
    const summary = [
      `📧 Email Summary:`,
      `  From: ${emailData.from}`,
      `  To: ${emailData.to.join(', ')}`,
      `  Subject: ${emailData.subject}`,
      `  Date: ${emailData.date.toISOString()}`,
      `  Body Length: ${emailData.bodyText.length} chars`,
      `  Attachments: ${emailData.attachments.length}`,
      `  Auth: SPF=${emailData.authentication.spfPass} DKIM=${emailData.authentication.dkimValid} DMARC=${emailData.authentication.dmarcPass}`,
      `  Email Hash: ${emailData.emailHash}`,
      `  Body Hash: ${emailData.bodyHash}`
    ];
    
    if (emailData.attachments.length > 0) {
      summary.push(`  📎 Attachments:`);
      emailData.attachments.forEach((att, i) => {
        summary.push(`    ${i + 1}. ${att.filename} (${att.size} bytes, ${att.contentType})`);
      });
    }
    
    return summary.join('\n');
  }
}

export default EmailParser;
