// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title EryzaaStaking
 * @dev Staking contract for ERYZA tokens with rewards distribution
 */
contract EryzaaStaking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 reward);
    event RewardsAdded(uint256 amount);

    // Structs
    struct UserInfo {
        uint256 stakedAmount;
        uint256 rewardDebt;
        uint256 lastStakeTime;
    }

    // State variables
    IERC20 public stakeToken; // ERYZA token
    IERC20 public rewardToken; // ERYZA token (same as stake token)
    
    uint256 public totalStaked;
    uint256 public rewardPerTokenStored;
    uint256 public lastUpdateTime;
    uint256 public rewardRate; // rewards per second
    uint256 public rewardsDuration = 7 days;
    uint256 public periodFinish;
    
    uint256 public constant MINIMUM_STAKE = 100 * 10**18; // 100 ERYZA minimum
    uint256 public constant LOCK_PERIOD = 7 days; // 7 days lock period
    
    mapping(address => UserInfo) public userInfo;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    
    constructor(address _stakeToken, address _rewardToken) {
        stakeToken = IERC20(_stakeToken);
        rewardToken = IERC20(_rewardToken);
    }

    /**
     * @dev Update reward variables
     */
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /**
     * @dev Get last time reward applicable
     */
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    /**
     * @dev Calculate reward per token
     */
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        
        return rewardPerTokenStored + 
            (((lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18) / totalStaked);
    }

    /**
     * @dev Calculate earned rewards for a user
     */
    function earned(address account) public view returns (uint256) {
        UserInfo memory user = userInfo[account];
        return (user.stakedAmount * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18 + rewards[account];
    }

    /**
     * @dev Stake tokens
     */
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount >= MINIMUM_STAKE, "Amount below minimum stake");
        require(amount > 0, "Cannot stake 0");
        
        UserInfo storage user = userInfo[msg.sender];
        
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        
        user.stakedAmount += amount;
        user.lastStakeTime = block.timestamp;
        totalStaked += amount;
        
        emit Staked(msg.sender, amount);
    }

    /**
     * @dev Unstake tokens
     */
    function unstake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot unstake 0");
        
        UserInfo storage user = userInfo[msg.sender];
        require(user.stakedAmount >= amount, "Insufficient staked amount");
        require(
            block.timestamp >= user.lastStakeTime + LOCK_PERIOD,
            "Tokens still locked"
        );
        
        user.stakedAmount -= amount;
        totalStaked -= amount;
        
        stakeToken.safeTransfer(msg.sender, amount);
        
        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev Claim rewards
     */
    function claimRewards() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardsClaimed(msg.sender, reward);
        }
    }

    /**
     * @dev Exit staking (unstake all and claim rewards)
     */
    function exit() external {
        UserInfo memory user = userInfo[msg.sender];
        unstake(user.stakedAmount);
        claimRewards();
    }

    /**
     * @dev Add rewards to the contract (only owner)
     */
    function addRewards(uint256 reward) external onlyOwner updateReward(address(0)) {
        require(reward > 0, "Cannot add 0 rewards");
        
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / rewardsDuration;
        }
        
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;
        
        rewardToken.safeTransferFrom(msg.sender, address(this), reward);
        
        emit RewardsAdded(reward);
    }

    /**
     * @dev Set rewards duration (only owner)
     */
    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwner {
        require(
            block.timestamp > periodFinish,
            "Previous rewards period must be complete"
        );
        rewardsDuration = _rewardsDuration;
    }

    /**
     * @dev Get user staking info
     */
    function getUserInfo(address account) 
        external 
        view 
        returns (
            uint256 stakedAmount,
            uint256 earnedRewards,
            uint256 lockTimeRemaining
        ) 
    {
        UserInfo memory user = userInfo[account];
        stakedAmount = user.stakedAmount;
        earnedRewards = earned(account);
        
        if (block.timestamp < user.lastStakeTime + LOCK_PERIOD) {
            lockTimeRemaining = (user.lastStakeTime + LOCK_PERIOD) - block.timestamp;
        } else {
            lockTimeRemaining = 0;
        }
    }

    /**
     * @dev Get staking stats
     */
    function getStakingStats() 
        external 
        view 
        returns (
            uint256 _totalStaked,
            uint256 _rewardRate,
            uint256 _periodFinish,
            uint256 _rewardPerTokenStored
        ) 
    {
        _totalStaked = totalStaked;
        _rewardRate = rewardRate;
        _periodFinish = periodFinish;
        _rewardPerTokenStored = rewardPerTokenStored;
    }

    /**
     * @dev Emergency withdraw (only owner, for emergency situations)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
