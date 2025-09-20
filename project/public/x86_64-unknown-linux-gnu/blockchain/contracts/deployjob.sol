// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./EryzaToken.sol";

/**
 * @title EryzaJobEscrow
 * @dev Escrow and job management contract for Eryza compute network
 * Handles job lifecycle, payments, and proof-of-compute verification
 */
contract EryzaJobEscrow is ReentrancyGuard, Pausable, AccessControl {
    // =============================================================================
    // ROLES
    // =============================================================================
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");

    // =============================================================================
    // ENUMS
    // =============================================================================
    
    enum JobStatus {
        Pending,        // Job submitted, waiting for provider
        Claimed,        // Provider claimed the job
        Completed,      // Proof submitted and verified
        Disputed,       // Job is under dispute
        Cancelled,      // Job cancelled by user
        Expired         // Job expired without completion
    }

    enum JobCategory {
        AITraining,
        AIInference,
        Rendering,
        DataProcessing,
        General
    }

    // =============================================================================
    // STRUCTS
    // =============================================================================
    
    struct Job {
        uint256 jobId;
        address user;
        address provider;
        uint256 amount;
        JobCategory category;
        JobStatus status;
        bytes32 jobSpecHash;        // Hash of job specifications
        bytes32 proofHash;          // Hash of compute proof
        uint256 deadline;           // Job completion deadline
        uint256 createdAt;
        uint256 claimedAt;
        uint256 completedAt;
        string ipfsHash;            // IPFS hash for detailed job data
        bool disputed;
    }

    struct ProviderStats {
        uint256 totalJobsCompleted;
        uint256 totalJobsFailed;
        uint256 totalEarnings;
        uint256 reputation;         // Calculated reputation score
        uint256 lastActiveAt;
        bool isActive;
    }

    struct DisputeInfo {
        uint256 jobId;
        address initiator;
        string reason;
        uint256 createdAt;
        bool resolved;
        address resolver;
    }

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================
    
    EryzaToken public immutable eryzaToken;
    
    // Job management
    uint256 private jobIdCounter;
    mapping(uint256 => Job) public jobs;
    mapping(address => uint256[]) public userJobs;
    mapping(address => uint256[]) public providerJobs;
    
    // Provider reputation system
    mapping(address => ProviderStats) public providerStats;
    
    // Disputes
    mapping(uint256 => DisputeInfo) public disputes;
    
    // Configuration
    uint256 public defaultJobDuration = 24 hours;
    uint256 public minimumJobAmount = 1e18; // 1 ERY minimum
    uint256 public platformFeePercent = 250; // 2.5% (basis points)
    uint256 public disputeTimeWindow = 7 days;
    
    // Platform earnings
    uint256 public totalPlatformFees;
    address public feeCollector;

    // =============================================================================
    // EVENTS
    // =============================================================================
    
    // Job lifecycle events
    event JobSubmitted(
        uint256 indexed jobId,
        address indexed user,
        uint256 amount,
        JobCategory category,
        bytes32 jobSpecHash,
        string ipfsHash,
        uint256 deadline
    );
    
    event JobClaimed(
        uint256 indexed jobId,
        address indexed provider,
        uint256 claimedAt
    );
    
    event JobCompleted(
        uint256 indexed jobId,
        address indexed provider,
        bytes32 proofHash,
        uint256 completedAt
    );
    
    event JobCancelled(
        uint256 indexed jobId,
        address indexed user,
        uint256 refundAmount
    );
    
    event JobExpired(
        uint256 indexed jobId,
        address indexed user,
        uint256 refundAmount
    );
    
    // Payment events
    event PaymentReleased(
        uint256 indexed jobId,
        address indexed provider,
        uint256 amount,
        uint256 platformFee
    );
    
    // Dispute events
    event DisputeCreated(
        uint256 indexed jobId,
        address indexed initiator,
        string reason
    );
    
    event DisputeResolved(
        uint256 indexed jobId,
        address indexed resolver,
        bool providerWins
    );
    
    // Reputation events
    event ReputationUpdated(
        address indexed provider,
        uint256 oldReputation,
        uint256 newReputation
    );

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    constructor(
        address _eryzaToken,
        address _feeCollector
    ) {
        require(_eryzaToken != address(0), "Invalid token address");
        require(_feeCollector != address(0), "Invalid fee collector");
        
        eryzaToken = EryzaToken(_eryzaToken);
        feeCollector = _feeCollector;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(DISPUTE_RESOLVER_ROLE, msg.sender);
    }

    // =============================================================================
    // JOB LIFECYCLE FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Submit a new job and lock payment in escrow
     * @param amount Payment amount in ERY tokens
     * @param category Job category
     * @param jobSpecHash Hash of job specifications
     * @param ipfsHash IPFS hash containing detailed job data
     * @param customDeadline Custom deadline (0 for default)
     */
    function submitJob(
        uint256 amount,
        JobCategory category,
        bytes32 jobSpecHash,
        string calldata ipfsHash,
        uint256 customDeadline
    ) external nonReentrant whenNotPaused returns (uint256) {
        require(amount >= minimumJobAmount, "Amount below minimum");
        require(jobSpecHash != bytes32(0), "Invalid job spec hash");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        
        // Transfer tokens to escrow
        require(
            eryzaToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
        jobIdCounter++;
        uint256 jobId = jobIdCounter;
        
        uint256 deadline = customDeadline == 0 ? 
            block.timestamp + defaultJobDuration : 
            customDeadline;
        
        require(deadline > block.timestamp, "Invalid deadline");
        
        jobs[jobId] = Job({
            jobId: jobId,
            user: msg.sender,
            provider: address(0),
            amount: amount,
            category: category,
            status: JobStatus.Pending,
            jobSpecHash: jobSpecHash,
            proofHash: bytes32(0),
            deadline: deadline,
            createdAt: block.timestamp,
            claimedAt: 0,
            completedAt: 0,
            ipfsHash: ipfsHash,
            disputed: false
        });
        
        userJobs[msg.sender].push(jobId);
        
        emit JobSubmitted(
            jobId,
            msg.sender,
            amount,
            category,
            jobSpecHash,
            ipfsHash,
            deadline
        );
        
        return jobId;
    }
    
    /**
     * @notice Provider claims a pending job
     * @param jobId Job identifier
     */
    function claimJob(uint256 jobId) external nonReentrant whenNotPaused {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Pending, "Job not available");
        require(block.timestamp < job.deadline, "Job expired");
        require(job.user != msg.sender, "Cannot claim own job");
        
        // Check if provider is eligible (has minimum stake in token contract)
        require(
            eryzaToken.isProviderEligible(msg.sender),
            "Provider not eligible"
        );
        
        job.provider = msg.sender;
        job.status = JobStatus.Claimed;
        job.claimedAt = block.timestamp;
        
        providerJobs[msg.sender].push(jobId);
        providerStats[msg.sender].isActive = true;
        providerStats[msg.sender].lastActiveAt = block.timestamp;
        
        emit JobClaimed(jobId, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Provider submits proof of compute completion
     * @param jobId Job identifier
     * @param proofHash Hash of the compute proof/result
     */
    function submitProof(
        uint256 jobId,
        bytes32 proofHash
    ) external nonReentrant whenNotPaused {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Claimed, "Job not claimed or completed");
        require(job.provider == msg.sender, "Not the job provider");
        require(block.timestamp < job.deadline, "Job deadline passed");
        require(proofHash != bytes32(0), "Invalid proof hash");
        
        job.proofHash = proofHash;
        job.status = JobStatus.Completed;
        job.completedAt = block.timestamp;
        
        // Calculate platform fee
        uint256 platformFee = (job.amount * platformFeePercent) / 10000;
        uint256 providerPayment = job.amount - platformFee;
        
        // Update provider stats
        ProviderStats storage stats = providerStats[msg.sender];
        stats.totalJobsCompleted++;
        stats.totalEarnings += providerPayment;
        stats.lastActiveAt = block.timestamp;
        
        // Update reputation
        _updateProviderReputation(msg.sender);
        
        // Release payment
        totalPlatformFees += platformFee;
        require(eryzaToken.transfer(msg.sender, providerPayment), "Payment failed");
        require(eryzaToken.transfer(feeCollector, platformFee), "Fee transfer failed");
        
        emit JobCompleted(jobId, msg.sender, proofHash, block.timestamp);
        emit PaymentReleased(jobId, msg.sender, providerPayment, platformFee);
    }
    
    /**
     * @notice User cancels a pending job and gets refund
     * @param jobId Job identifier
     */
    function cancelJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.user == msg.sender, "Not job owner");
        require(job.status == JobStatus.Pending, "Job cannot be cancelled");
        
        job.status = JobStatus.Cancelled;
        
        // Refund the user
        require(eryzaToken.transfer(msg.sender, job.amount), "Refund failed");
        
        emit JobCancelled(jobId, msg.sender, job.amount);
    }

    // =============================================================================
    // DISPUTE FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Create a dispute for a completed job
     * @param jobId Job identifier
     * @param reason Reason for dispute
     */
    function createDispute(
        uint256 jobId,
        string calldata reason
    ) external nonReentrant {
        Job storage job = jobs[jobId];
        require(job.status == JobStatus.Completed, "Job not completed");
        require(
            job.user == msg.sender || job.provider == msg.sender,
            "Not authorized"
        );
        require(!job.disputed, "Already disputed");
        require(
            block.timestamp <= job.completedAt + disputeTimeWindow,
            "Dispute window closed"
        );
        
        job.disputed = true;
        job.status = JobStatus.Disputed;
        
        disputes[jobId] = DisputeInfo({
            jobId: jobId,
            initiator: msg.sender,
            reason: reason,
            createdAt: block.timestamp,
            resolved: false,
            resolver: address(0)
        });
        
        emit DisputeCreated(jobId, msg.sender, reason);
    }
    
    /**
     * @notice Resolve a dispute (admin only)
     * @param jobId Job identifier
     * @param providerWins True if provider wins dispute
     */
    function resolveDispute(
        uint256 jobId,
        bool providerWins
    ) external onlyRole(DISPUTE_RESOLVER_ROLE) {
        Job storage job = jobs[jobId];
        DisputeInfo storage dispute = disputes[jobId];
        
        require(job.disputed, "No active dispute");
        require(!dispute.resolved, "Already resolved");
        
        dispute.resolved = true;
        dispute.resolver = msg.sender;
        
        if (!providerWins) {
            // Provider loses - update reputation negatively
            ProviderStats storage stats = providerStats[job.provider];
            stats.totalJobsFailed++;
            _updateProviderReputation(job.provider);
            
            // Could implement slashing here if provider has stake
        }
        
        emit DisputeResolved(jobId, msg.sender, providerWins);
    }

    // =============================================================================
    // AUTOMATED FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Handle expired jobs (can be called by anyone)
     * @param jobId Job identifier
     */
    function handleExpiredJob(uint256 jobId) external nonReentrant {
        Job storage job = jobs[jobId];
        require(
            job.status == JobStatus.Pending || job.status == JobStatus.Claimed,
            "Job not eligible for expiration"
        );
        require(block.timestamp >= job.deadline, "Job not expired yet");
        
        job.status = JobStatus.Expired;
        
        // If job was claimed but not completed, mark provider as failed
        if (job.status == JobStatus.Claimed && job.provider != address(0)) {
            ProviderStats storage stats = providerStats[job.provider];
            stats.totalJobsFailed++;
            _updateProviderReputation(job.provider);
        }
        
        // Refund user
        require(eryzaToken.transfer(job.user, job.amount), "Refund failed");
        
        emit JobExpired(jobId, job.user, job.amount);
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Get job details
     * @param jobId Job identifier
     */
    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }
    
    /**
     * @notice Get user's job history
     * @param user User address
     */
    function getUserJobs(address user) external view returns (uint256[] memory) {
        return userJobs[user];
    }
    
    /**
     * @notice Get provider's job history
     * @param provider Provider address
     */
    function getProviderJobs(address provider) external view returns (uint256[] memory) {
        return providerJobs[provider];
    }
    
    /**
     * @notice Get provider statistics
     * @param provider Provider address
     */
    function getProviderStats(address provider) external view returns (ProviderStats memory) {
        return providerStats[provider];
    }
    
    /**
     * @notice Get current job counter
     */
    function getCurrentJobId() external view returns (uint256) {
        return jobIdCounter.current();
    }
    
    /**
     * @notice Get all pending jobs (paginated)
     * @param offset Starting offset
     * @param limit Number of jobs to return
     */
    function getPendingJobs(
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory jobIds) {
        uint256 currentId = jobIdCounter.current();
        uint256 count = 0;
        
        // Count pending jobs
        for (uint256 i = 1; i <= currentId && count < limit; i++) {
            if (jobs[i].status == JobStatus.Pending && block.timestamp < jobs[i].deadline) {
                count++;
            }
        }
        
        jobIds = new uint256[](count);
        uint256 index = 0;
        uint256 skipped = 0;
        
        // Collect pending job IDs
        for (uint256 i = 1; i <= currentId && index < count; i++) {
            if (jobs[i].status == JobStatus.Pending && block.timestamp < jobs[i].deadline) {
                if (skipped >= offset) {
                    jobIds[index] = i;
                    index++;
                } else {
                    skipped++;
                }
            }
        }
        
        // Resize array if needed
        assembly {
            mstore(jobIds, index)
        }
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Update platform configuration
     */
    function updateConfiguration(
        uint256 _defaultJobDuration,
        uint256 _minimumJobAmount,
        uint256 _platformFeePercent,
        uint256 _disputeTimeWindow
    ) external onlyRole(ADMIN_ROLE) {
        require(_platformFeePercent <= 1000, "Fee too high"); // Max 10%
        
        defaultJobDuration = _defaultJobDuration;
        minimumJobAmount = _minimumJobAmount;
        platformFeePercent = _platformFeePercent;
        disputeTimeWindow = _disputeTimeWindow;
    }
    
    /**
     * @notice Update fee collector address
     */
    function setFeeCollector(address _feeCollector) external onlyRole(ADMIN_ROLE) {
        require(_feeCollector != address(0), "Invalid address");
        feeCollector = _feeCollector;
    }
    
    /**
     * @notice Pause contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Emergency withdraw (admin only, for stuck funds)
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        
        if (token == address(0)) {
            payable(to).transfer(amount);
        } else {
            EryzaToken(token).transfer(to, amount);
        }
    }

    // =============================================================================
    // INTERNAL FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Update provider reputation based on performance
     * @param provider Provider address
     */
    function _updateProviderReputation(address provider) internal {
        ProviderStats storage stats = providerStats[provider];
        uint256 totalJobs = stats.totalJobsCompleted + stats.totalJobsFailed;
        
        if (totalJobs == 0) {
            stats.reputation = 1000; // Starting reputation
            return;
        }
        
        // Simple reputation calculation: completion rate * 1000
        uint256 oldReputation = stats.reputation;
        stats.reputation = (stats.totalJobsCompleted * 1000) / totalJobs;
        
        emit ReputationUpdated(provider, oldReputation, stats.reputation);
    }
}