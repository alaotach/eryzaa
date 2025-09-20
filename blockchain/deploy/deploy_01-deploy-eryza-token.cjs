const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config.cjs");
const { verify } = require("../utils/verify.cjs");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    log("----------------------------------------------------");
    log("Deploying EryzaToken...");
    log(`Deploying from: ${deployer}`);
    
    // Get deployer balance using standard ethers
    try {
        const balance = await ethers.provider.getBalance(deployer);
        const balanceInAvax = ethers.formatEther(balance);
        log(`Deployer balance: ${balanceInAvax} AVAX`);
        
        if (parseFloat(balanceInAvax) < 0.1) {
            log("⚠️  Warning: Low AVAX balance. Consider adding more AVAX for deployment.");
        }
    } catch (error) {
        log("Could not fetch balance:", error.message);
    }

    // Contract constructor arguments
    const INITIAL_SUPPLY = ethers.parseEther(process.env.INITIAL_SUPPLY || "1000000");

    const args = [INITIAL_SUPPLY];

    // Get gas price using standard ethers
    let gasPrice;
    try {
        const currentGasPrice = await ethers.provider.getGasPrice();
        gasPrice = currentGasPrice;
        log(`Current gas price: ${ethers.formatUnits(currentGasPrice, "gwei")} gwei`);
    } catch (error) {
        log("Could not fetch gas price:", error.message);
        gasPrice = network.config.gasPrice;
    }

    const eryzaToken = await deploy("EryzaToken", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
        gasLimit: 3000000, // Reduced from 6000000
        gasPrice: gasPrice,
    });

    log(`✅ EryzaToken deployed at ${eryzaToken.address}`);
    
    // Basic contract verification using ethers
    try {
        const code = await ethers.provider.getCode(eryzaToken.address);
        if (code && code !== '0x') {
            log(`✅ Contract verification: Bytecode confirmed on-chain`);
        }
    } catch (error) {
        log("Could not verify contract deployment:", error.message);
    }

    // Verify contract on Snowtrace if not on development chain
    if (!developmentChains.includes(network.name) && process.env.SNOWTRACE_API_KEY) {
        log("Verifying contract on Snowtrace...");
        await verify(eryzaToken.address, args);
    }

    log("----------------------------------------------------");
};

module.exports.tags = ["all", "token", "eryza"];