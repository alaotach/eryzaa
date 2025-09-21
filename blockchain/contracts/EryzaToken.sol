// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EryzaToken (ERYZA)
 * @dev ERC20 token for the Eryza decentralized computing platform
 */
contract EryzaToken is ERC20, Ownable, Pausable {
    
    uint256 public constant MAX_SUPPLY = 1000000000 * 10**18; // 1 billion tokens
    uint256 public constant INITIAL_SUPPLY = 100000000 * 10**18; // 100 million tokens
    
    // Token distribution percentages
    uint256 public constant TEAM_PERCENT = 20; // 20%
    uint256 public constant INVESTORS_PERCENT = 15; // 15%
    uint256 public constant COMMUNITY_PERCENT = 30; // 30%
    uint256 public constant TREASURY_PERCENT = 25; // 25%
    uint256 public constant LIQUIDITY_PERCENT = 10; // 10%
    
    // Vesting addresses
    address public teamVesting;
    address public investorVesting;
    address public communityRewards;
    address public treasury;
    address public liquidityPool;
    
    // Minting control
    mapping(address => bool) public minters;
    uint256 public totalMinted;
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event TokensMinted(address indexed to, uint256 amount);
    
    modifier onlyMinter() {
        require(minters[msg.sender], "Not authorized minter");
        _;
    }
    
    constructor(
        address _teamVesting,
        address _investorVesting,
        address _communityRewards,
        address _treasury,
        address _liquidityPool
    ) ERC20("Eryza Token", "ERYZA") Ownable(msg.sender) {
        teamVesting = _teamVesting;
        investorVesting = _investorVesting;
        communityRewards = _communityRewards;
        treasury = _treasury;
        liquidityPool = _liquidityPool;
        
        // Initial token distribution
        _mint(_teamVesting, (INITIAL_SUPPLY * TEAM_PERCENT) / 100);
        _mint(_investorVesting, (INITIAL_SUPPLY * INVESTORS_PERCENT) / 100);
        _mint(_communityRewards, (INITIAL_SUPPLY * COMMUNITY_PERCENT) / 100);
        _mint(_treasury, (INITIAL_SUPPLY * TREASURY_PERCENT) / 100);
        _mint(_liquidityPool, (INITIAL_SUPPLY * LIQUIDITY_PERCENT) / 100);
        
        totalMinted = INITIAL_SUPPLY;
    }
    
    /**
     * @dev Add a minter address
     */
    function addMinter(address minter) external onlyOwner {
        require(minter != address(0), "Invalid minter address");
        minters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /**
     * @dev Remove a minter address
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /**
     * @dev Mint new tokens (only by authorized minters)
     */
    function mint(address to, uint256 amount) external onlyMinter whenNotPaused {
        require(to != address(0), "Invalid recipient");
        require(totalMinted + amount <= MAX_SUPPLY, "Exceeds max supply");
        
        _mint(to, amount);
        totalMinted += amount;
        
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Burn tokens
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    /**
     * @dev Burn tokens from another account (with allowance)
     */
    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }
    
    /**
     * @dev Pause token transfers (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Hook that is called before any transfer of tokens
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        require(!paused(), "Token transfers paused");
        super._update(from, to, amount);
    }
    
    /**
     * @dev Get remaining mintable supply
     */
    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalMinted;
    }
}
