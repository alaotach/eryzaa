const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config.cjs");
const { verify } = require("../utils/verify.cjs");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log, get } = deployments;
    const { deployer, feeCollector } = await getNamedAccounts();

    log("----------------------------------------------------");
    log("Deploying EryzaJobEscrow...");

    // Get previously deployed EryzaToken
    const eryzaToken = await get("EryzaToken");

    const args = [eryzaToken.address, feeCollector];

    const jobEscrow = await deploy("EryzaJobEscrow", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
        gasLimit: 8000000,
    });

    log(`EryzaJobEscrow deployed at ${jobEscrow.address}`);

    // Grant JOB_MANAGER_ROLE to the job escrow contract on the token
    log("Setting up contract permissions...");
    const tokenContract = await ethers.getContractAt("EryzaToken", eryzaToken.address);
    const JOB_MANAGER_ROLE = await tokenContract.JOB_MANAGER_ROLE();
    
    const hasRole = await tokenContract.hasRole(JOB_MANAGER_ROLE, jobEscrow.address);
    if (!hasRole) {
        const tx = await tokenContract.grantRole(JOB_MANAGER_ROLE, jobEscrow.address);
        await tx.wait();
        log("Granted JOB_MANAGER_ROLE to JobEscrow contract");
    }

    // Verify contract on etherscan if not on development chain
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying contract...");
        await verify(jobEscrow.address, args);
    }

    log("----------------------------------------------------");
};

module.exports.tags = ["all", "escrow", "eryza"];
module.exports.dependencies = ["token"];