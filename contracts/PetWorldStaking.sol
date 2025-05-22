// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PetWorldStaking
 * @dev Contract for staking PetWorld tokens to earn PetWorld token rewards
 */
contract PetWorldStaking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant CYCLE_DURATION = 1 hours;  // Each cycle lasts for 1 hour
    uint256 public constant DISTRIBUTION_RATIO = 10**13;  // Distribution ratio, 0.00001 (10^-5 * 10^18)
    uint256 public constant PRECISION_FACTOR = 1e18;   // Used to improve calculation precision
    uint256 public constant MAX_CYCLE_PROCESS = 1000; // Maximum cycles to process in a single update
    uint256 public constant MAX_CYCLE_RANGE = 1000;    // Maximum cycle range for reward calculation
    uint256 public constant DUST_THRESHOLD = 10**12;   // 0.000001 tokens - considered dust for withdrawal (pre-computed value)
    
    // Contract addresses
    address public petWorldToken;              // PetWorld token address
    
    // Financials
    uint256 public rewardPoolBalance;          // Reward pool balance - does not include user staked tokens
    uint256 public totalStakedAmount;          // Total staked amount across all users
    
    // Cycle-related variables
    uint256 public currentCycle;               // Current cycle
    uint256 public lastUpdateTimestamp;        // Last update timestamp
    
    // Staking information
    struct StakingRecord {
        uint256 recordId;                      // Unique identifier for the staking record
        uint256 stakedAmount;                  // Amount staked
        uint256 lastClaimedCycle;              // Last claimed reward cycle
        uint256 pendingRewards;                // Pending rewards
        uint256 stakingStartTime;              // Timestamp when staking began
    }
    
    // Cycle statistics
    struct CycleStats {
        uint256 totalStakedTokens;             // Total staked tokens in this cycle
        uint256 petWorldDistributed;           // Amount of PETWORLD distributed in this cycle
        bool distributionCalculated;           // Whether distribution for this cycle has been calculated
    }
    
    // Staking records for each user
    mapping(address => StakingRecord[]) public userStakingRecords;
    
    // Record management
    mapping(address => mapping(uint256 => uint256)) public stakingRecordIndex; // user => recordId => array index
    mapping(address => mapping(uint256 => bool)) public userHasStakingRecord;  // user => recordId => exists
    uint256 private nextRecordId = 1; // Global record ID counter
    
    // Active staker tracking
    mapping(address => bool) public isActiveStaker;
    mapping(address => uint256) public userStakingRecordCount; // Track the number of staking records per user
    
    // Cycle statistics information
    mapping(uint256 => CycleStats) public cycleStats;
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 recordId);
    event Withdrawn(address indexed user, uint256 amount, uint256 recordId);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 recordId);
    event AllRewardsClaimed(address indexed user, uint256 amount);
    event StakingUpdated(address indexed user, uint256 amount, uint256 cycle, uint256 recordId);
    event CycleUpdated(uint256 oldCycle, uint256 newCycle, uint256 processedCycles);
    event RewardPoolLow(uint256 requested, uint256 available);
    event ContractRenounced(address indexed previousOwner);
    event StakingRecordRemoved(address indexed user, uint256 recordId);
    
    /**
     * @dev Constructor
     * @param _petWorldToken PetWorld token address
     */
    constructor(
        address _petWorldToken
    ) Ownable(msg.sender) {
        require(_petWorldToken != address(0), "PetWorld token address cannot be zero");
        
        petWorldToken = _petWorldToken;
        rewardPoolBalance = 0;
        totalStakedAmount = 0;
        
        // Initialize cycle and timestamp
        currentCycle = 1;
        lastUpdateTimestamp = block.timestamp;
        nextRecordId = 1;
    }

    /**
     * @dev Get the current PetWorld balance of the contract
     * @return Balance amount
     */
    function getBalance() public view returns (uint256) {
        return IERC20(petWorldToken).balanceOf(address(this));
    }
       
    /**
     * @dev Add to the reward pool balance
     * @param amount Amount to add
     */
    function addRewardPool(uint256 amount) external nonReentrant {
        // Checks
        require(amount > 0, "Amount must be greater than zero");
        
        // Effects - update state
        rewardPoolBalance += amount;
        
        // Interactions - external calls
        IERC20(petWorldToken).safeTransferFrom(msg.sender, address(this), amount);
    }
    
    /**
     * @dev Update the current cycle
     * Calculate the actual current cycle based on the passage of time
     * Limit the number of cycles to process at once
     * @return uint256 Number of cycles processed
     */
    function _updateCycle() internal returns (uint256) {
        uint256 elapsedTime = block.timestamp - lastUpdateTimestamp;
        uint256 elapsedCycles = elapsedTime / CYCLE_DURATION;
        
        if (elapsedCycles > MAX_CYCLE_PROCESS) {
            elapsedCycles = MAX_CYCLE_PROCESS;
        }
        
        if (elapsedCycles > 0) {
            uint256 oldCycle = currentCycle;
            
            // Use reward pool balance instead of total balance of the contract
            uint256 petWorldBalance = rewardPoolBalance;
            
            // Calculate the distribution amount for each cycle (0.00001 of the balance)
            uint256 distributionAmount = 0;
            if (petWorldBalance > 0) {
                distributionAmount = (petWorldBalance / PRECISION_FACTOR) * DISTRIBUTION_RATIO;
            }
            
            // Update the distribution amount for each new cycle
            for (uint256 i = 1; i <= elapsedCycles; i++) {
                uint256 cycleToUpdate = currentCycle + i;
                // Set the distribution amount for this cycle, not set as calculated
                cycleStats[cycleToUpdate].petWorldDistributed = distributionAmount;
                
                // If it's the first cycle, set the total staked amount to the total staked amount of the current cycle
                if (i == 1) {
                    cycleStats[cycleToUpdate].totalStakedTokens = cycleStats[currentCycle].totalStakedTokens;
                } else {
                    // For subsequent cycles, set the total staked amount to the total staked amount of the previous cycle
                    cycleStats[cycleToUpdate].totalStakedTokens = cycleStats[currentCycle + i - 1].totalStakedTokens;
                }
                
                // Set that the distribution for this cycle has been calculated
                cycleStats[cycleToUpdate].distributionCalculated = true;
            }
            
            // Update the current cycle
            currentCycle += elapsedCycles;
            lastUpdateTimestamp = block.timestamp;
            
            emit CycleUpdated(oldCycle, currentCycle, elapsedCycles);
        }
        
        return elapsedCycles;
    }
    
    /**
     * @dev Add user to active stakers if they're not already in it
     * @param user Address of the user to add
     */
    function _addToActiveStakers(address user) internal {
        if (!isActiveStaker[user]) {
            isActiveStaker[user] = true;
        }
    }
    
    /**
     * @dev Remove user from active stakers if they have no more staking records
     * @param user Address of the user to remove
     */
    function _removeFromActiveStakers(address user) internal {
        if (userStakingRecordCount[user] == 0) {
            isActiveStaker[user] = false;
        }
    }
    
    // Removed _updateEligibleAmount function as we no longer use lastDepositTimestamp and rewardEligibleAmount
    
    /**
     * @dev Calculate rewards for a staking record within a specific cycle range
     * @param stakingRecord The staking record to calculate rewards for
     * @param fromCycle Starting cycle
     * @param toCycle Ending cycle
     * @return Total rewards within the cycle range
     */
    function _calculateRewardsBetweenCycles(
        StakingRecord storage stakingRecord, 
        uint256 fromCycle, 
        uint256 toCycle
    ) internal view returns (uint256) {
        uint256 totalRewards = 0;
        
        // Check valid input parameters
        if (stakingRecord.stakedAmount == 0 || fromCycle > toCycle) {
            return 0;
        }
        
        // Limit the cycle range to prevent gas limit issues
        if (toCycle - fromCycle > MAX_CYCLE_RANGE) {
            fromCycle = toCycle - MAX_CYCLE_RANGE;
        }
        
        // Iterate through each cycle to calculate the user's rewards
        for (uint256 cycle = fromCycle; cycle <= toCycle; cycle++) {
            CycleStats storage stats = cycleStats[cycle];
            
            // If the total staked amount for this cycle is 0, skip
            if (stats.totalStakedTokens == 0) {
                continue;
            }
            
            // If there is no distribution amount for this cycle, skip
            if (stats.petWorldDistributed == 0) {
                continue;
            }
            
            // Calculate the user's rewards for this cycle based on their staked amount
            uint256 cycleReward = (stakingRecord.stakedAmount / stats.totalStakedTokens) * stats.petWorldDistributed;
            
            totalRewards += cycleReward;
        }
        
        return totalRewards;
    }
    
    /**
     * @dev Update rewards for a staking record
     * @param stakingRecord The staking record to update
     * @return rewards Amount of new rewards calculated
     */
    function _updateStakingRecordRewards(StakingRecord storage stakingRecord) internal returns (uint256 rewards) {
        // If staking record has no stake or is already up-to-date, return 0
        if (stakingRecord.stakedAmount == 0 || stakingRecord.lastClaimedCycle >= currentCycle) {
            return 0;
        }
        
        // Calculate rewards
        uint256 fromCycle = stakingRecord.lastClaimedCycle + 1;
        uint256 toCycle = currentCycle;
        
        rewards = _calculateRewardsBetweenCycles(stakingRecord, fromCycle, toCycle);
        
        // Update last claimed cycle
        stakingRecord.lastClaimedCycle = currentCycle;
        stakingRecord.pendingRewards += rewards;
        
        return rewards;
    }
    
    /**
     * @dev Physically remove a staking record from the user's array
     * @param user The user address
     * @param recordId The ID of the staking record to remove
     */
    function _removeStakingRecord(address user, uint256 recordId) internal {
        require(userHasStakingRecord[user][recordId], "Record does not exist");
        
        uint256 index = stakingRecordIndex[user][recordId];
        uint256 lastIndex = userStakingRecords[user].length - 1;
        
        // If this is not the last element, move the last element to this position
        if (index != lastIndex) {
            StakingRecord storage lastRecord = userStakingRecords[user][lastIndex];
            userStakingRecords[user][index] = lastRecord;
            stakingRecordIndex[user][lastRecord.recordId] = index;
        }
        
        // Remove the last element
        userStakingRecords[user].pop();
        
        // Update mappings
        delete stakingRecordIndex[user][recordId];
        delete userHasStakingRecord[user][recordId];
        
        // Decrease counter
        userStakingRecordCount[user]--;
        
        // Update active stakers
        _removeFromActiveStakers(user);
        
        emit StakingRecordRemoved(user, recordId);
    }

    /**
     * @dev Stake tokens
     * @param amount Amount of PetWorld to stake
     * @return recordId The unique ID assigned to this staking record
     */
    function stake(uint256 amount) public nonReentrant returns (uint256) {
        // Checks
        require(amount > 0, "Amount must be greater than zero");
        
        // Update cycle
        _updateCycle();
        
        address user = msg.sender;
        
        // Create a new staking record with a unique ID
        uint256 recordId = nextRecordId++;
        uint256 stakingIndex = userStakingRecords[user].length;
        
                 // Create the new staking record
         userStakingRecords[user].push(StakingRecord({
             recordId: recordId,
             stakedAmount: amount,
             lastClaimedCycle: currentCycle + 1,
             pendingRewards: 0,
             stakingStartTime: block.timestamp
         }));
        
        // Update mapping to track the record
        stakingRecordIndex[user][recordId] = stakingIndex;
        userHasStakingRecord[user][recordId] = true;
        userStakingRecordCount[user]++;
        
        // Mark as active staker
        _addToActiveStakers(user);
        
        // Update the total staked amount for the current cycle
        cycleStats[currentCycle].totalStakedTokens += amount;
        totalStakedAmount += amount;
        
        // Interactions - external calls
        IERC20(petWorldToken).safeTransferFrom(user, address(this), amount);
        
        emit Staked(user, amount, recordId);
        emit StakingUpdated(user, amount, currentCycle, recordId);
        
        return recordId;
    }
    
    /**
     * @dev Withdraw staked tokens from a specific record
     * @param recordId The unique ID of the staking record
     * @param amount Amount of tokens to withdraw, 0 means withdraw all
     */
    function withdraw(uint256 recordId, uint256 amount) public nonReentrant {
        require(amount > 0, "Amount must be greater than zero");
        // Checks
        address user = msg.sender;
        require(userHasStakingRecord[user][recordId], "No staking record found with this ID");
        
        uint256 stakingIndex = stakingRecordIndex[user][recordId];
        StakingRecord storage stakingRecord = userStakingRecords[user][stakingIndex];
        
        require(amount <= stakingRecord.stakedAmount, "Amount exceeds staked balance");
    
        // Update cycle
        _updateCycle();
        
        // Effects - calculate and record pending rewards
        _updateStakingRecordRewards(stakingRecord);
        
        // Process the withdrawal
        stakingRecord.stakedAmount -= amount;
        
        // Consider it a full withdrawal if the remaining amount is very small (dust)
        bool isFullWithdrawal = stakingRecord.stakedAmount == 0 || stakingRecord.stakedAmount < DUST_THRESHOLD;
        
        // No special handling for partial withdrawals needed anymore
        // as we no longer track reward eligibility separately
        
        // Update the total staked amount
        totalStakedAmount -= amount;
        
        // Update the total staked amount for the current cycle
        uint256 cycleStakedTokens = cycleStats[currentCycle].totalStakedTokens;
        cycleStats[currentCycle].totalStakedTokens = (amount >= cycleStakedTokens) 
            ? 0 
            : cycleStakedTokens - amount;
        
        // Harvest any pending rewards if this is a full withdrawal
        uint256 pendingRewards = 0;
        if (isFullWithdrawal && stakingRecord.pendingRewards > 0) {
            pendingRewards = stakingRecord.pendingRewards;
            stakingRecord.pendingRewards = 0;
            
            // Ensure the reward pool has enough balance
            if (pendingRewards > rewardPoolBalance) {
                emit RewardPoolLow(pendingRewards, rewardPoolBalance);
                pendingRewards = rewardPoolBalance;
            }
            
            if (pendingRewards > 0) {
                // Deduct the distributed rewards from the reward pool
                rewardPoolBalance -= pendingRewards;
            }
        }
        
        // Interactions - external calls
        IERC20(petWorldToken).safeTransfer(user, amount);
        
        // Send any pending rewards if available
        if (pendingRewards > 0) {
            IERC20(petWorldToken).safeTransfer(user, pendingRewards);
            emit RewardsClaimed(user, pendingRewards, recordId);
        }
        
        // If full withdrawal, physically remove the record
        if (isFullWithdrawal) {
            _removeStakingRecord(user, recordId);
        } else {
            emit StakingUpdated(user, stakingRecord.stakedAmount, currentCycle, recordId);
        }
        
        emit Withdrawn(user, amount, recordId);
    }
    
    /**
     * @dev Claim rewards from a specific staking record
     * @param recordId The unique ID of the staking record to claim rewards from
     */
    function claimRewards(uint256 recordId) public nonReentrant {
        // Checks
        address user = msg.sender;
        require(userHasStakingRecord[user][recordId], "No staking record found with this ID");
        
        uint256 stakingIndex = stakingRecordIndex[user][recordId];
        StakingRecord storage stakingRecord = userStakingRecords[user][stakingIndex];
        
        // Ensure minimum staking period of 1 hour has passed
        require(block.timestamp >= stakingRecord.stakingStartTime + CYCLE_DURATION, "Minimum staking period not met");
        require(stakingRecord.lastClaimedCycle < currentCycle, "Rewards already claimed for this cycle");
        // Update cycle
        _updateCycle();
        
        // Update staking record rewards
        _updateStakingRecordRewards(stakingRecord);
        
        uint256 rewards = stakingRecord.pendingRewards;
        
        // Checks
        require(rewards > 0, "No rewards to claim");
        
        // Effects - update state before interactions
        // Reset pending rewards
        stakingRecord.pendingRewards = 0;
        
        // Ensure the reward pool has enough balance
        if (rewards > rewardPoolBalance) {
            emit RewardPoolLow(rewards, rewardPoolBalance);
            rewards = rewardPoolBalance;
        }
        
        // Deduct the distributed rewards from the reward pool
        rewardPoolBalance -= rewards;
        
        // Interactions - external calls
        IERC20(petWorldToken).safeTransfer(user, rewards);
        
        emit RewardsClaimed(user, rewards, recordId);
    }
    
    /**
     * @dev Claim all pending rewards from all staking records
     */
    function claimAllRewards() public nonReentrant {
        // Checks
        address user = msg.sender;
        require(isActiveStaker[user], "User has no active staking records");
        
        // Update cycle
        _updateCycle();
        
        uint256 totalRewards = 0;
        
        // Process all staking records
        for (uint256 i = 0; i < userStakingRecords[user].length; i++) {
            StakingRecord storage stakingRecord = userStakingRecords[user][i];
            
            // Only include records that meet the minimum staking period of 1 hour
            if (block.timestamp >= stakingRecord.stakingStartTime + CYCLE_DURATION && stakingRecord.lastClaimedCycle < currentCycle) {
                // Update staking record rewards
                _updateStakingRecordRewards(stakingRecord);
                
                // Add pending rewards to total
                if (stakingRecord.pendingRewards > 0) {
                    totalRewards += stakingRecord.pendingRewards;
                    stakingRecord.pendingRewards = 0;
                }
            }
        }
        
        // Checks
        require(totalRewards > 0, "No rewards to claim");
        
        // Ensure the reward pool has enough balance
        if (totalRewards > rewardPoolBalance) {
            emit RewardPoolLow(totalRewards, rewardPoolBalance);
            totalRewards = rewardPoolBalance;
        }
        
        // Deduct the distributed rewards from the reward pool
        rewardPoolBalance -= totalRewards;
        
        // Interactions - external calls
        IERC20(petWorldToken).safeTransfer(user, totalRewards);
        
        emit AllRewardsClaimed(user, totalRewards);
    }
    
         /**
     * @dev Update a specific staking record's rewards
     * @param recordId The unique ID of the staking record to update
     */
    function updateStakingRecord(uint256 recordId) public {
        // Checks
        address user = msg.sender;
        require(userHasStakingRecord[user][recordId], "No staking record found with this ID");
        
        uint256 stakingIndex = stakingRecordIndex[user][recordId];
        StakingRecord storage stakingRecord = userStakingRecords[user][stakingIndex];
        
        // Update cycle
        _updateCycle();
        
        // Update rewards
        uint256 newRewards = _updateStakingRecordRewards(stakingRecord);
        
        if (newRewards > 0) {
            emit StakingUpdated(user, stakingRecord.stakedAmount, currentCycle, recordId);
        }
    }
    
    /**
     * @dev Set PetWorldToken address
     * @param _petWorldToken New PetWorldToken address
     */
    function setPetWorldToken(address _petWorldToken) external onlyOwner {
        require(_petWorldToken != address(0), "PetWorld token address cannot be zero");
        petWorldToken = _petWorldToken;
    }
} 