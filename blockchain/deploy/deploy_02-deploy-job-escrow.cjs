const { network, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config.cjs");
const { verify } = require("../utils/verify.cjs");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments;
    const { deployer, feeCollector } = await getNamedAccounts();

    log("----------------------------------------------------");
    log("Deploying EryzaComputeMarketplace...");

    // Get previously deployed EryzaToken
    const eryzaToken = await get("EryzaToken");

    const args = [eryzaToken.address]; // Only payment token address

    const marketplace = await deploy("EryzaComputeMarketplace", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
        gasLimit: 8000000,
    });

    log(`EryzaComputeMarketplace deployed at ${marketplace.address}`);

    // Grant JOB_MANAGER_ROLE to the marketplace contract on the token (if the role exists)
    log("Setting up contract permissions...");
    try {
        const tokenContract = await ethers.getContractAt("EryzaToken", eryzaToken.address);
        
        // Check if JOB_MANAGER_ROLE exists
        try {
            const JOB_MANAGER_ROLE = await tokenContract.JOB_MANAGER_ROLE();
            const hasRole = await tokenContract.hasRole(JOB_MANAGER_ROLE, marketplace.address);
            if (!hasRole) {
                const tx = await tokenContract.grantRole(JOB_MANAGER_ROLE, marketplace.address);
                await tx.wait();
                log("Granted JOB_MANAGER_ROLE to marketplace contract");
            } else {
                log("Marketplace already has JOB_MANAGER_ROLE");
            }
        } catch (roleError) {
            log("JOB_MANAGER_ROLE not found in token contract, skipping role assignment");
        }
    } catch (error) {
        log("Could not set up permissions:", error.message);
    }

    // Verify contract on etherscan if not on development chain
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying contract...");
        await verify(marketplace.address, args);
    }

    log("----------------------------------------------------");
};

module.exports.tags = ["all", "escrow", "eryza"];
module.exports.dependencies = ["token"];