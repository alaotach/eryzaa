const { network, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config.cjs");
const { verify } = require("../utils/verify.cjs");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    log("----------------------------------------------------");
    log("� Deploying EryzaJobsLedger...");
    log(`� Deploying from: ${deployer}`);
    
    // Get deployer balance
    try {
        const balance = await ethers.provider.getBalance(deployer);
        const balanceInAvax = ethers.formatEther(balance);
        log(`💰 Deployer balance: ${balanceInAvax} AVAX`);
        
        if (parseFloat(balanceInAvax) < 0.1) {
            log("⚠️  Warning: Low AVAX balance. Consider adding more AVAX for deployment.");
        }
    } catch (error) {
        log("Could not fetch balance:", error.message);
    }

    // Get deployed contract addresses
    const eryzaTokenAddress = process.env.VITE_ERYZA_TOKEN_ADDRESS || "0xB02A143e4CF3Cca229897D7FF9ddfb78405c7152";
    const marketplaceAddress = process.env.VITE_MARKETPLACE_ADDRESS || "0x4e093Ee1fF01320d0dDd879032B0A80D28574D84";

    log(`🪙 Using EryzaToken at: ${eryzaTokenAddress}`);
    log(`🏪 Using Marketplace at: ${marketplaceAddress}`);

    // Contract constructor arguments (EryzaJobsLedger only takes token address)
    const args = [
        eryzaTokenAddress
    ];

    // Get gas price
    let gasPrice;
    try {
        const feeData = await ethers.provider.getFeeData();
        gasPrice = feeData.gasPrice;
        log(`⛽ Current gas price: ${ethers.formatUnits(feeData.gasPrice, "gwei")} gwei`);
    } catch (error) {
        log("Could not fetch gas price:", error.message);
        gasPrice = network.config.gasPrice;
    }

    const jobsLedger = await deploy("EryzaJobsLedger", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
        gasLimit: 6000000, // Large contract needs more gas
        gasPrice: gasPrice,
    });

    log(`✅ EryzaJobsLedger deployed at ${jobsLedger.address}`);
    
    // Basic contract verification
    try {
        const code = await ethers.provider.getCode(jobsLedger.address);
        if (code && code !== '0x') {
            log(`✅ Contract verification: Bytecode confirmed on-chain`);
        }
    } catch (error) {
        log("Could not verify contract deployment:", error.message);
    }

    // Update deployment summary
    log("\n🎉 Deployment Summary:");
    log("========================");
    log(`📋 Jobs Ledger Address: ${jobsLedger.address}`);
    log(`🔗 EryzaToken Address: ${eryzaTokenAddress}`);
    log(`🔗 Marketplace Address: ${marketplaceAddress}`);
    log("\n💡 Add this to your .env file:");
    log(`VITE_JOBS_LEDGER_ADDRESS=${jobsLedger.address}`);

    // Verify contract on Snowtrace if not on development chain
    if (!developmentChains.includes(network.name) && process.env.SNOWTRACE_API_KEY) {
        log("🔍 Verifying contract on Snowtrace...");
        await verify(jobsLedger.address, args);
    }

    log("----------------------------------------------------");
};

module.exports.tags = ["all", "jobs-ledger", "jobs"];
