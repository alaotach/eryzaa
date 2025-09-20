// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// --- Import OpenZeppelin Libraries ---
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// --- Optional: AccessControl for granular roles (can replace Ownable) ---
// import "@openzeppelin/contracts/access/AccessControl.sol";

// --- EryzaToken Contract ---
contract EryzaToken is ERC20, Ownable, Pausable, ReentrancyGuard {
    // --- Escrow Storage ---
    struct JobEscrow {
        uint256 amount;
        address user;
        address provider;
        bool locked;
        bool released;
        uint256 deadline;
    }

    // jobId => escrow details
    mapping(bytes32 => JobEscrow) public jobEscrows;

    // --- Events ---
    event TokensLocked(bytes32 indexed jobId, address indexed user, address indexed provider, uint256 amount);
    event TokensReleased(bytes32 indexed jobId, address indexed provider, uint256 amount);
    event TokensRefunded(bytes32 indexed jobId, address indexed user, uint256 amount);

    // --- Constructor ---
    constructor(uint256 initialSupply) ERC20("Eryza Token", "ERY") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    // --- Core ERC-20 features (inherited) ---

    // --- Job-based Escrow Functions ---

    /**
     * Lock tokens in escrow for a job
     * @param jobId Unique identifier for the job
     * @param amount Amount of tokens to lock
     * @param provider Address of the compute provider
     */
    function lockTokens(bytes32 jobId, uint256 amount, address provider) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be greater than 0");
        require(provider != address(0), "Invalid provider address");
        require(!jobEscrows[jobId].locked, "Job already has locked tokens");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Transfer tokens from user to this contract
        _transfer(msg.sender, address(this), amount);

        // Create escrow record
        jobEscrows[jobId] = JobEscrow({
            amount: amount,
            user: msg.sender,
            provider: provider,
            locked: true,
            released: false,
            deadline: block.timestamp + 24 hours // Default 24-hour deadline
        });

        emit TokensLocked(jobId, msg.sender, provider, amount);
    }

    /**
     * Release tokens to the provider upon job completion
     * @param jobId Unique identifier for the job
     */
    function releaseTokens(bytes32 jobId) external nonReentrant whenNotPaused onlyOwner {
        JobEscrow storage escrow = jobEscrows[jobId];
        require(escrow.locked && !escrow.released, "Invalid escrow state");

        // Transfer tokens to provider
        _transfer(address(this), escrow.provider, escrow.amount);
        escrow.released = true;
        escrow.locked = false;

        emit TokensReleased(jobId, escrow.provider, escrow.amount);
    }

    /**
     * Refund tokens to the user if job fails or is cancelled
     * @param jobId Unique identifier for the job
     */
    function refundTokens(bytes32 jobId) external nonReentrant whenNotPaused onlyOwner {
        JobEscrow storage escrow = jobEscrows[jobId];
        require(escrow.locked && !escrow.released, "Invalid escrow state");

        // Transfer tokens back to user
        _transfer(address(this), escrow.user, escrow.amount);
        escrow.released = true;
        escrow.locked = false;

        emit TokensRefunded(jobId, escrow.user, escrow.amount);
    }

    /**
     * Partial refund in case of disputes
     * @param jobId Unique identifier for the job
     * @param refundAmount Amount to refund to user (rest goes to provider)
     */
    function partialRefund(bytes32 jobId, uint256 refundAmount) external nonReentrant whenNotPaused onlyOwner {
        JobEscrow storage escrow = jobEscrows[jobId];
        require(escrow.locked && !escrow.released, "Invalid escrow state");
        require(refundAmount <= escrow.amount, "Refund exceeds locked amount");

        uint256 providerAmount = escrow.amount - refundAmount;

        // Transfer refund to user
        if (refundAmount > 0) {
            _transfer(address(this), escrow.user, refundAmount);
        }

        // Transfer remaining to provider
        if (providerAmount > 0) {
            _transfer(address(this), escrow.provider, providerAmount);
        }

        escrow.released = true;
        escrow.locked = false;

        emit TokensRefunded(jobId, escrow.user, refundAmount);
        emit TokensReleased(jobId, escrow.provider, providerAmount);
    }

    // --- Emergency Stop / Admin Functions ---
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * Get escrow details for a job
     * @param jobId Unique identifier for the job
     * @return amount Amount of tokens locked
     * @return user Address of the user who locked tokens
     * @return provider Address of the compute provider
     * @return locked Whether tokens are currently locked
     * @return released Whether tokens have been released
     * @return deadline Deadline for the job
     */
    function getEscrowDetails(bytes32 jobId) external view returns (
        uint256 amount,
        address user,
        address provider,
        bool locked,
        bool released,
        uint256 deadline
    ) {
        JobEscrow memory escrow = jobEscrows[jobId];
        return (escrow.amount, escrow.user, escrow.provider, escrow.locked, escrow.released, escrow.deadline);
    }
}
