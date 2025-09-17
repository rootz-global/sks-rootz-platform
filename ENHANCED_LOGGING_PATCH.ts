      // FINAL CONTRACT CALL WITH VALIDATED PARAMETERS
      try {
        console.log('🔍 ATTEMPTING CONTRACT CALL WITH GAS ESTIMATION...');
        
        // First, estimate gas to see what the contract expects
        const gasEstimate = await this.emailDataWalletContract.estimateGas.createEmailDataWallet(
          validatedUserAddress,
          uniqueEmailHash,
          subjectHash,
          contentHash,
          senderHash,
          validatedAttachmentHashes,
          metadata
        );
        
        console.log(`📊 Gas estimate: ${gasEstimate.toString()} (vs our limit: 500,000)`);
        
        if (gasEstimate.gt(450000)) {
          console.warn('⚠️ Gas estimate exceeds 450k - may indicate contract validation failure');
        }
        
        const createTx = await this.emailDataWalletContract.createEmailDataWallet(
          validatedUserAddress,        // address userAddress
          uniqueEmailHash,             // string emailHash (UNIQUE)
          subjectHash,                 // string subjectHash (NON-EMPTY, <500)
          contentHash,                 // string contentHash (NON-EMPTY, <500)  
          senderHash,                  // string senderHash (NON-EMPTY, <500)
          validatedAttachmentHashes,   // string[] attachmentHashes (ALL NON-EMPTY, <500)
          metadata,                    // string metadata (NON-EMPTY, <500)
          {
            gasLimit: Math.max(gasEstimate.mul(120).div(100), 500000), // 20% buffer or 500k minimum
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
        
      } catch (gasEstimationError: any) {
        console.error('❌ GAS ESTIMATION FAILED - Contract will likely revert:');
        console.error('   Error:', gasEstimationError.message);
        
        // Try to extract revert reason from gas estimation error
        if (gasEstimationError.reason) {
          console.error('   Revert Reason:', gasEstimationError.reason);
        }
        
        if (gasEstimationError.message?.includes('InvalidStringLength')) {
          console.error('   CAUSE: One of the string parameters exceeds 500 characters');
          console.error('   Check: emailHash, subjectHash, contentHash, senderHash, metadata lengths');
        } else if (gasEstimationError.message?.includes('InvalidHashValue')) {
          console.error('   CAUSE: One of the hash parameters is empty');
          console.error('   Check: emailHash, subjectHash, contentHash, senderHash are non-empty');
        } else if (gasEstimationError.message?.includes('EmailHashAlreadyExists')) {
          console.error('   CAUSE: Email hash collision detected in contract');
          console.error(`   Conflicting hash: ${uniqueEmailHash}`);
        } else if (gasEstimationError.message?.includes('MaxWalletsExceeded')) {
          console.error('   CAUSE: User has reached maximum wallet limit (1000)');
        } else if (gasEstimationError.message?.includes('InvalidAttachmentCount')) {
          console.error('   CAUSE: Too many attachments (max 100)');
          console.error(`   Attachment count: ${validatedAttachmentHashes.length}`);
        } else {
          console.error('   CAUSE: Unknown contract validation failure');
          console.error('   Full error object:', JSON.stringify(gasEstimationError, null, 2));
        }
        
        throw new Error(`Gas estimation failed: ${gasEstimationError.reason || gasEstimationError.message}`);
      }
