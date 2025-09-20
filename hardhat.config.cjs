require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },

  networks: {
    // Avalanche Networks
    avalanche: {
      url: process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      gasPrice: 225000000000, // 225 gwei
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },

    fuji: {
      url: process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      gasPrice: 225000000000,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },

  // Contract verification
  etherscan: {
    apiKey: {
      avalanche: process.env.SNOWTRACE_API_KEY,
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY,
    },
  },

  // Named accounts for deployment
  namedAccounts: {
    deployer: {
      default: 0,
      avalanche: process.env.DEPLOYER_ADDRESS || 0,
      fuji: process.env.DEPLOYER_ADDRESS || 0,
    },
    feeCollector: {
      default: 1,
      avalanche: process.env.FEE_COLLECTOR_ADDRESS || 1,
      fuji: process.env.FEE_COLLECTOR_ADDRESS || 1,
    },
    admin: {
      default: 0,
      avalanche: process.env.ADMIN_ADDRESS || 0,
      fuji: process.env.ADMIN_ADDRESS || 0,
    },
  },
};