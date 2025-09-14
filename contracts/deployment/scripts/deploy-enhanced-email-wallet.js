// IMPORTANT: This deployment script uses ethers v5 syntax for Polygon compatibility
// Do NOT upgrade to ethers v6 - it causes Polygon network transaction issues

const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Starting EmailDataWalletOS_Secure deployment...");
  console.log("📋 Using ethers v5 for Polygon compatibility");
  
  // Get network information
  const network = await ethers.provider.getNetwork();
  console.log(`📡 Deploying to network: ${network.name} (${network.chainId})`);
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deploying from account: ${deployer.address}`);
  
  // Check balance - Using ethers v5 syntax
  const balance = await deployer.getBalance();
  console.log(`💰 Account balance: ${ethers.utils.formatEther(balance)} POL`);
  
  // Set initial owner (service wallet address)
  const initialOwner = deployer.address;
  console.log(`🔑 Initial owner will be: ${initialOwner}`);
  
  console.log("\n🔨 Deploying EmailDataWalletOS_Secure...");
  
  // Get contract factory
  const EmailDataWalletOS = await ethers.getContractFactory("EmailDataWalletOS_Secure");
  
  // Estimate gas - Using ethers v5 syntax
  const deploymentData = EmailDataWalletOS.getDeployTransaction(initialOwner);
  const estimatedGas = await ethers.provider.estimateGas(deploymentData);
  const gasPrice = await ethers.provider.getGasPrice();
  const estimatedCost = estimatedGas.mul(gasPrice);
  
  console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`);
  console.log(`💨 Gas price: ${ethers.utils.formatUnits(gasPrice, "gwei")} gwei`);
  console.log(`💵 Estimated cost: ${ethers.utils.formatEther(estimatedCost)} POL`);
  
  // Deploy contract
  const contract = await EmailDataWalletOS.deploy(initialOwner);
  console.log(`📤 Deployment transaction: ${contract.deployTransaction.hash}`);
  console.log("⏳ Waiting for deployment confirmation...");
  
  // Wait for deployment
  await contract.deployed();
  
  // Get deployment receipt
  const receipt = await contract.deployTransaction.wait();
  
  console.log("\n🎉 === DEPLOYMENT SUCCESSFUL ===");
  console.log(`📍 Contract Address: ${contract.address}`);
  console.log(`🔗 Transaction Hash: ${contract.deployTransaction.hash}`);
  console.log(`📦 Block Number: ${receipt.blockNumber}`);
  console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`💰 Actual Cost: ${ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice))} POL`);
  
  // Save deployment information
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    contractName: "EmailDataWalletOS_Secure",
    contractAddress: contract.address,
    transactionHash: contract.deployTransaction.hash,
    blockNumber: receipt.blockNumber,
    deployer: deployer.address,
    gasUsed: receipt.gasUsed.toString(),
    gasPrice: receipt.effectiveGasPrice.toString(),
    cost: ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice)),
    timestamp: new Date().toISOString(),
    ethersVersion: "5.7.2",
    note: "Deployed using ethers v5 for Polygon compatibility"
  };
  
  const deploymentFile = path.join(__dirname, `../deployment-${network.name}-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${deploymentFile}`);
  
  // Verify contract has the expected functions
  console.log("\n🔍 Verifying contract functions...");
  try {
    const owner = await contract.owner();
    console.log(`✅ Contract owner: ${owner}`);
    
    // Test a few key functions exist
    const contractInterface = contract.interface;
    const functions = [
      'createEmailDataWallet',
      'getEmailDataWallet',
      'updateEmailDataWallet',
      'getAllUserWallets',
      'getActiveWalletCount',
      'getTotalWalletCount',
      'walletExists'
    ];
    
    functions.forEach(func => {
      try {
        const fragment = contractInterface.getFunction(func);
        console.log(`✅ Function verified: ${func}`);
      } catch (error) {
        console.log(`❌ Function missing: ${func}`);
      }
    });
    
    // Test constants
    const maxStringLength = await contract.MAX_STRING_LENGTH();
    const maxAttachmentCount = await contract.MAX_ATTACHMENT_COUNT();
    const maxWalletsPerUser = await contract.MAX_WALLETS_PER_USER();
    
    console.log(`📊 Contract Constants:`);
    console.log(`   MAX_STRING_LENGTH: ${maxStringLength}`);
    console.log(`   MAX_ATTACHMENT_COUNT: ${maxAttachmentCount}`);
    console.log(`   MAX_WALLETS_PER_USER: ${maxWalletsPerUser}`);
    
  } catch (error) {
    console.log(`⚠️  Contract verification error: ${error.message}`);
  }
  
  // Update platform configuration guidance
  console.log("\n📋 NEXT STEPS:");
  console.log("1. Update your platform configuration with the new contract address:");
  console.log(`   contractEmailDataWallet=${contract.address}`);
  console.log("2. Update BlockchainService.ts to use the new contract");
  console.log("3. Test the contract integration");
  console.log("4. Verify the contract on PolygonScan (optional)");
  console.log("\n🔗 PolygonScan URL:");
  console.log(`   https://amoy.polygonscan.com/address/${contract.address}`);
  
  // Generate configuration update commands
  console.log("\n📝 Configuration Update Commands:");
  console.log("For Ubuntu server:");
  console.log(`   nano ~/.data-wallet/localhost/config.ini`);
  console.log(`   # Update: contractEmailDataWallet=${contract.address}`);
  console.log("\nFor Windows development:");
  console.log(`   # Update config-template-localhost.ini`);
  console.log(`   contractEmailDataWallet=${contract.address}`);
  
  console.log("\n⚠️  CRITICAL REMINDER:");
  console.log("   Keep ethers at version 5.7.2 for Polygon compatibility");
  console.log("   Do NOT upgrade to ethers v6 - it breaks Polygon transactions");
  
  return {
    address: contract.address,
    deploymentInfo: deploymentInfo
  };
}

main()
  .then((result) => {
    console.log(`\n🎯 Contract deployed successfully to: ${result.address}`);
    console.log(`📋 Deployment record saved`);
    console.log(`🔒 Using proven ethers v5.7.2 for Polygon compatibility`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    console.error("\n💡 If you see empty data fields or gas issues:");
    console.error("   Verify you're using ethers v5.7.2, not v6");
    console.error("   Check: npm list ethers");
    process.exit(1);
  });
