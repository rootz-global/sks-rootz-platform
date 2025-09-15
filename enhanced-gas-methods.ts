  // Enhanced gas pricing utility with detailed logging
  private async getGasPricing(): Promise<{ maxFeePerGas: ethers.BigNumber; maxPriorityFeePerGas: ethers.BigNumber }> {
    try {
      console.log('🔍 [GAS] Fetching network gas pricing data...');
      
      const feeData = await this.provider.getFeeData();
      console.log('🔍 [GAS] Network fee data received:', {
        maxFeePerGas: feeData.maxFeePerGas ? ethers.utils.formatUnits(feeData.maxFeePerGas, 'gwei') + ' gwei' : 'null',
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') + ' gwei' : 'null',
        gasPrice: feeData.gasPrice ? ethers.utils.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'null'
      });
      
      // Updated minimums based on successful contract deployment (93-102 gwei)
      const minGasPrice = ethers.utils.parseUnits('100', 'gwei');
      const minPriorityFee = ethers.utils.parseUnits('30', 'gwei');
      
      console.log('🔍 [GAS] Polygon Amoy minimums:', {
        minGasPrice: '100 gwei',
        minPriorityFee: '30 gwei'
      });
      
      const maxFeePerGas = feeData.maxFeePerGas?.gt(minGasPrice) ? feeData.maxFeePerGas : minGasPrice;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas?.gt(minPriorityFee) ? feeData.maxPriorityFeePerGas : minPriorityFee;
      
      const finalPricing = {
        maxFeePerGas: ethers.utils.formatUnits(maxFeePerGas, 'gwei') + ' gwei',
        maxPriorityFeePerGas: ethers.utils.formatUnits(maxPriorityFeePerGas, 'gwei') + ' gwei'
      };
      
      console.log('✅ [GAS] Final gas pricing selected:', finalPricing);
      
      return { maxFeePerGas, maxPriorityFeePerGas };
    } catch (error) {
      console.error('❌ [GAS] Failed to get network gas pricing:', error);
      
      // Fallback values based on successful deployment
      const fallbackMaxFee = ethers.utils.parseUnits('110', 'gwei');
      const fallbackPriorityFee = ethers.utils.parseUnits('35', 'gwei');
      
      console.log('⚠️ [GAS] Using fallback gas pricing:', {
        maxFeePerGas: '110 gwei',
        maxPriorityFeePerGas: '35 gwei'
      });
      
      return {
        maxFeePerGas: fallbackMaxFee,
        maxPriorityFeePerGas: fallbackPriorityFee
      };
    }
  }

  async testBlockchainWrite(): Promise<boolean> {
    try {
      console.log('🧪 [TEST] Starting detailed blockchain write test...');
      
      if (!this.serviceWallet) {
        console.error('❌ [TEST] No service wallet available for blockchain write test');
        return false;
      }

      console.log(`🔑 [TEST] Service wallet: ${this.serviceWallet.address}`);
      
      // Check balance with detailed logging
      const balance = await this.serviceWallet.getBalance();
      const balanceEth = ethers.utils.formatEther(balance);
      console.log(`💰 [TEST] Service wallet balance: ${balanceEth} POL`);
      
      const minRequired = ethers.utils.parseEther('0.01');
      if (balance.lt(minRequired)) {
        console.error(`❌ [TEST] Insufficient balance. Required: 0.01 POL, Available: ${balanceEth} POL`);
        return false;
      }

      // Test gas pricing
      console.log('⛽ [TEST] Testing gas price estimation...');
      const gasPricing = await this.getGasPricing();
      
      // Calculate transaction cost
      const gasLimit = 21000;
      const maxCost = gasPricing.maxFeePerGas.mul(gasLimit);
      const maxCostEth = ethers.utils.formatEther(maxCost);
      console.log(`💰 [TEST] Estimated max transaction cost: ${maxCostEth} POL`);
      
      if (balance.lt(maxCost.add(ethers.utils.parseEther('0.001')))) {
        console.error(`❌ [TEST] Insufficient balance for gas. Max cost: ${maxCostEth} POL`);
        return false;
      }

      console.log('📡 [TEST] Attempting simple self-transaction...');
      console.log('📋 [TEST] Transaction parameters:', {
        to: this.serviceWallet.address,
        value: '0.001 POL',
        gasLimit: gasLimit,
        maxFeePerGas: ethers.utils.formatUnits(gasPricing.maxFeePerGas, 'gwei') + ' gwei',
        maxPriorityFeePerGas: ethers.utils.formatUnits(gasPricing.maxPriorityFeePerGas, 'gwei') + ' gwei'
      });
      
      const txRequest = {
        to: this.serviceWallet.address,
        value: ethers.utils.parseEther('0.001'),
        gasLimit: gasLimit,
        maxFeePerGas: gasPricing.maxFeePerGas,
        maxPriorityFeePerGas: gasPricing.maxPriorityFeePerGas
      };
      
      console.log('🔄 [TEST] Submitting transaction...');
      const tx = await this.serviceWallet.sendTransaction(txRequest);
      console.log(`📤 [TEST] Transaction submitted with hash: ${tx.hash}`);
      
      console.log('⏳ [TEST] Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      
      const actualGasUsed = receipt.gasUsed;
      const actualCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
      const actualCostEth = ethers.utils.formatEther(actualCost);
      
      console.log('✅ [TEST] Transaction confirmed successfully!');
      console.log('📊 [TEST] Transaction results:', {
        blockNumber: receipt.blockNumber,
        gasUsed: actualGasUsed.toString(),
        effectiveGasPrice: ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei') + ' gwei',
        actualCost: actualCostEth + ' POL',
        status: receipt.status === 1 ? 'SUCCESS' : 'FAILED'
      });
      
      return receipt.status === 1;
    } catch (error) {
      console.error('❌ [TEST] Blockchain write test failed with error:', error);
      
      // Enhanced error analysis
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        console.error('💡 [TEST] Gas estimation failed - likely insufficient balance or gas price too low');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        console.error('💡 [TEST] Insufficient funds for transaction');
      } else if (error.message?.includes('gas')) {
        console.error('💡 [TEST] Gas-related error - check gas prices and limits');
      } else if (error.message?.includes('nonce')) {
        console.error('💡 [TEST] Nonce-related error - transaction ordering issue');
      }
      
      return false;
    }
  }