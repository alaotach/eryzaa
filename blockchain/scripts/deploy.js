const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying Eryzaa contracts to Avalanche...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "AVAX");
    
    // Deploy EryzaaToken first
    console.log("\n1. Deploying EryzaaToken...");
    
    const EryzaaToken = await ethers.getContractFactory("EryzaaToken");
    const eryzaaToken = await EryzaaToken.deploy(
        "0x1234567890123456789012345678901234567890", // teamVesting (placeholder)
        "0x2345678901234567890123456789012345678901", // investorVesting (placeholder)
        "0x3456789012345678901234567890123456789012", // communityRewards (placeholder)
        deployer.address, // treasury (deployer for now)
        deployer.address  // liquidityPool (deployer for now)
    );
    
    await eryzaaToken.deployed();
    console.log("EryzaaToken deployed to:", eryzaaToken.address);
    
    // Deploy EryzaaStaking
    console.log("\n2. Deploying EryzaaStaking...");
    
    const EryzaaStaking = await ethers.getContractFactory("EryzaaStaking");
    const eryzaaStaking = await EryzaaStaking.deploy(
        eryzaaToken.address, // stake token
        eryzaaToken.address  // reward token (same as stake token)
    );
    
    await eryzaaStaking.deployed();
    console.log("EryzaaStaking deployed to:", eryzaaStaking.address);
    
    // Deploy EryzaaComputeMarketplace
    console.log("\n3. Deploying EryzaaComputeMarketplace...");
    
    const EryzaaComputeMarketplace = await ethers.getContractFactory("EryzaaComputeMarketplace");
    const marketplace = await EryzaaComputeMarketplace.deploy(
        eryzaaToken.address // payment token
    );
    
    await marketplace.deployed();
    console.log("EryzaaComputeMarketplace deployed to:", marketplace.address);
    
    // Add staking contract as minter
    console.log("\n4. Setting up permissions...");
    
    await eryzaaToken.addMinter(eryzaaStaking.address);
    console.log("Added EryzaaStaking as minter");
    
    await eryzaaToken.addMinter(marketplace.address);
    console.log("Added EryzaaComputeMarketplace as minter");
    
    // Transfer some tokens to staking contract for rewards
    const rewardAmount = ethers.utils.parseEther("1000000"); // 1M tokens
    await eryzaaToken.transfer(eryzaaStaking.address, rewardAmount);
    console.log("Transferred", ethers.utils.formatEther(rewardAmount), "ERYZA to staking contract");
    
    console.log("\n=== Deployment Summary ===");
    console.log("EryzaaToken:", eryzaaToken.address);
    console.log("EryzaaStaking:", eryzaaStaking.address);
    console.log("EryzaaComputeMarketplace:", marketplace.address);
    console.log("Deployer:", deployer.address);
    
    // Save deployment info
    const deploymentInfo = {
        network: "avalanche",
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            EryzaaToken: eryzaaToken.address,
            EryzaaStaking: eryzaaStaking.address,
            EryzaaComputeMarketplace: marketplace.address
        }
    };
    
    const fs = require("fs");
    fs.writeFileSync(
        "deployment-info.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\nDeployment info saved to deployment-info.json");
    console.log("Deployment completed successfully! 🚀");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
