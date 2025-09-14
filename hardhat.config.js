require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

// IMPORTANT: This configuration is designed for ethers v5 compatibility
// Do NOT upgrade to ethers v6 - it causes Polygon network issues

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      // Local development network
    },
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    amoy: {
      url: "https://rpc-amoy.polygon.technology/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
      gasPrice: "auto",
      gas: "auto"
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  paths: {
    sources: "./contracts/active",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
