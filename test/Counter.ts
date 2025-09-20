const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EryzaToken", function () {
  it("Should deploy and have the right name", async function () {
    const Token = await ethers.getContractFactory("EryzaToken");
    const token = await Token.deploy();
    await token.deployed();

    expect(await token.name()).to.equal("Eryza Token");
  });
});
