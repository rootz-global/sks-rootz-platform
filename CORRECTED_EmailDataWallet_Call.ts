/**
 * CORRECTED EmailDataWallet Creation Call
 * Addresses ALL 12 validation requirements
 */

// CORRECTED authorizeEmailWalletCreation method
async authorizeEmailWalletCreation(
  requestId: string,
  userAddress: string,
  signature: string
): Promise<AuthorizationResult> {
  
  try {
    console.log('🔐 Processing authorization through UNIFIED CONTRACT...');
    console.log(`   Request ID: ${requestId}`);
    console.log(`   User Address: ${userAddress}`);
    
    // Get authorization request from DATABASE
    const request = await this.database.getAuthorizationRequest(requestId);
    if (!request) {
      throw new Error('Authorization request not found');
    }
    
    if (request.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error('Request belongs to different user');
    }
    
    if (request.status !== 'pending') {
      throw new Error(`Request status is ${request.status}, cannot authorize`);
    }
    
    if (new Date() > request.expiresAt) {
      await this.database.updateRequestStatus(requestId, 'expired');
      throw new Error('Authorization request has expired');
    }
    
    // Verify signature (user proving consent)
    const expectedAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(requestId), signature);
    
    if (expectedAddress.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error('Invalid signature - signature does not match user address');
    }
    
    console.log('✅ Signature verified - user consent proven');
    
    if (!request.emailData) {
      throw new Error('Email data not found in request');
    }
    
    // VALIDATION 1: Check contract owner (CRITICAL)
    const contractOwner = await this.emailDataWalletContract.owner();
    if (contractOwner.toLowerCase() !== this.serviceWallet.address.toLowerCase()) {
      throw new Error(`Service wallet ${this.serviceWallet.address} is not contract owner. Owner: ${contractOwner}`);
    }
    
    // VALIDATION 2: Check contract pause state
    const isPaused = await this.emailDataWalletContract.paused();
    if (isPaused) {
      throw new Error('Contract is paused - cannot create wallets');
    }
    
    // VALIDATION 3: Check user wallet count limit
    const userWalletCount = await this.emailDataWalletContract.getActiveWalletCount(userAddress);
    if (userWalletCount.gte(1000)) {
      throw new Error(`User has reached maximum wallet limit: ${userWalletCount.toString()}/1000`);
    }
    
    console.log('🎯 Calling EmailDataWalletOS_Secure.createEmailDataWallet()...');
    console.log(`   Contract Owner: ${contractOwner} ✅`);
    console.log(`   Contract Paused: ${isPaused} ✅`);
    console.log(`   User Wallet Count: ${userWalletCount.toString()}/1000 ✅`);
    
    // PREPARE VALIDATED PARAMETERS
    
    // PARAM 1: userAddress (already validated above)
    const validatedUserAddress = ethers.utils.getAddress(userAddress);
    
    // PARAM 2: emailHash - MUST BE UNIQUE and under 500 chars
    const uniqueEmailHash = `email-${requestId.substring(2, 10)}-${Date.now()}`.substring(0, 60);
    
    // Check if this emailHash already exists
    const emailHashExists = await this.emailDataWalletContract.emailHashExists(uniqueEmailHash);
    if (emailHashExists) {
      throw new Error(`Email hash collision detected: ${uniqueEmailHash}`);
    }
    
    // PARAM 3: subjectHash - Non-empty, under 500 chars
    const subjectHash = (request.emailData.subject || 'No-Subject-Provided').substring(0, 400);
    
    // PARAM 4: contentHash - Use actual body hash, ensure under 500 chars
    const contentHash = request.emailData.bodyHash?.substring(0, 64) || 
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes(
        request.emailData.bodyText || request.emailData.bodyHtml || 'empty-content'
      ));
    
    // PARAM 5: senderHash - Non-empty, under 500 chars  
    const senderHash = (request.emailData.from || 'unknown-sender').substring(0, 400);
    
    // PARAM 6: attachmentHashes - Validate each hash is non-empty and under 500 chars
    const validatedAttachmentHashes = (request.emailData.attachments || [])
      .map(att => att.contentHash || ethers.utils.keccak256(ethers.utils.toUtf8Bytes(att.filename || 'empty')))
      .filter(hash => hash && hash.length > 0)
      .map(hash => hash.substring(0, 64)) // Ensure under 500 chars
      .slice(0, 100); // MAX_ATTACHMENT_COUNT = 100
    
    // PARAM 7: metadata - Non-empty, under 500 chars, valid JSON structure
    const metadata = JSON.stringify({
      ipfsHash: request.ipfsHash || 'no-ipfs',
      timestamp: Date.now(),
      requestId: requestId.substring(0, 20),
      emailAuthentication: {
        spfPass: request.emailData.authentication?.spfPass || false,
        dkimValid: request.emailData.authentication?.dkimValid || false,
        dmarcPass: request.emailData.authentication?.dmarcPass || false
      }
    }).substring(0, 450); // Leave room for safety
    
    console.log('📋 VALIDATED PARAMETERS:');
    console.log(`   User Address: ${validatedUserAddress}`);
    console.log(`   Email Hash: ${uniqueEmailHash} (${uniqueEmailHash.length} chars)`);
    console.log(`   Subject Hash: ${subjectHash} (${subjectHash.length} chars)`);
    console.log(`   Content Hash: ${contentHash} (${contentHash.length} chars)`);
    console.log(`   Sender Hash: ${senderHash} (${senderHash.length} chars)`);
    console.log(`   Attachment Hashes: ${validatedAttachmentHashes.length} items`);
    console.log(`   Metadata: ${metadata.length} chars`);
    
    // Deduct credits first
    console.log(`💰 Deducting ${request.creditCost} credits from user...`);
    const deductTx = await this.registrationContract.deductCredits(
      userAddress,
      request.creditCost,
      {
        gasLimit: 200000,
        gasPrice: ethers.utils.parseUnits('30', 'gwei')
      }
    );
    await deductTx.wait();
    console.log(`✅ Credits deducted: ${deductTx.hash}`);
    
    // FINAL CONTRACT CALL WITH VALIDATED PARAMETERS
    const createTx = await this.emailDataWalletContract.createEmailDataWallet(
      validatedUserAddress,        // address userAddress
      uniqueEmailHash,             // string emailHash (UNIQUE)
      subjectHash,                 // string subjectHash (NON-EMPTY, <500)
      contentHash,                 // string contentHash (NON-EMPTY, <500)  
      senderHash,                  // string senderHash (NON-EMPTY, <500)
      validatedAttachmentHashes,   // string[] attachmentHashes (ALL NON-EMPTY, <500)
      metadata,                    // string metadata (NON-EMPTY, <500)
      {
        gasLimit: 500000,
        gasPrice: ethers.utils.parseUnits('30', 'gwei')
      }
    );
    
    console.log(`⏳ EMAIL_DATA_WALLET creation transaction: ${createTx.hash}`);
    
    const receipt = await createTx.wait();
    console.log(`✅ EMAIL_DATA_WALLET created in block ${receipt.blockNumber}`);
    
    // Extract wallet ID from events
    const walletId = this.extractWalletIdFromReceipt(receipt);
    
    // Update request status in DATABASE
    await this.database.updateRequestStatus(requestId, 'processed');
    
    console.log(`🎉 Complete EMAIL_DATA_WALLET created via unified contract:`);
    console.log(`   Wallet ID: ${walletId}`);
    console.log(`   Transaction: ${createTx.hash}`);
    console.log(`   Credits Deducted: ${request.creditCost}`);
    console.log(`   Owner: ${userAddress}`);
    
    return {
      success: true,
      requestId,
      emailWalletId: walletId || undefined,
      attachmentWalletIds: [],
      authorizationTx: createTx.hash,
      totalCreditsUsed: request.creditCost
    };
    
  } catch (error: any) {
    console.error('❌ Unified contract wallet creation failed:', error);
    
    // Enhanced error reporting
    if (error.message?.includes('InvalidStringLength')) {
      console.error('   CAUSE: Parameter exceeds 500 character limit');
    } else if (error.message?.includes('InvalidHashValue')) {
      console.error('   CAUSE: Empty string parameter detected'); 
    } else if (error.message?.includes('EmailHashAlreadyExists')) {
      console.error('   CAUSE: Email hash collision - not unique');
    } else if (error.message?.includes('MaxWalletsExceeded')) {
      console.error('   CAUSE: User has reached 1000 wallet limit');
    } else if (error.message?.includes('Pausable: paused')) {
      console.error('   CAUSE: Contract is paused');
    } else if (error.message?.includes('Ownable: caller is not the owner')) {
      console.error('   CAUSE: Service wallet is not contract owner');
    }
    
    return {
      success: false,
      error: error?.message || 'Unified contract wallet creation failed'
    };
  }
}
