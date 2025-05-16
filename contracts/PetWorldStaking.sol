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
    uint256 public constant DISTRIBUTION_RATIO = 1 * 10**13;  // Distribution ratio, 0.00001 (1 * 10^-5 * 10^18)
    uint256 public constant PRECISION_FACTOR = 1e18;   // Used to improve calculation precision
    uint256 public constant MAX_CYCLE_PROCESS = 10000; // Maximum cycles to process in a single update
    uint256 public constant MAX_CYCLE_RANGE = 1000;    // Maximum cycle range for reward calculation
    
    // Contract addresses
    address public petWorldToken;              // PetWorld token address
    
    // Financials
    uint256 public rewardPoolBalance;          // Reward pool balance - does not include user staked tokens
    
    // Cycle-related variables
    uint256 public currentCycle;               // Current cycle
    uint256 public lastUpdateTimestamp;        // Last update timestamp
    
    // Staking information
    struct StakingInfo {
        uint256 stakedAmount;                  // Amount staked
        uint256 lastClaimedCycle;              // Last claimed reward cycle
        uint256 pendingRewards;                // Pending rewards
        uint256 lastDepositTimestamp;          // Timestamp of last deposit
        uint256 rewardEligibleAmount;          // Amount eligible for rewards (staked for at least 24 hours)
    }
    
    // Cycle statistics
    struct CycleStats {
        uint256 totalStakedTokens;             // Total staked tokens in this cycle
        uint256 petWorldDistributed;           // Amount of PETWORLD distributed in this cycle
        bool distributionCalculated;           // Whether distribution for this cycle has been calculated
    }
    
    // User's staking information
    mapping(address => StakingInfo) public userStakingInfo;
    
    // Cycle statistics information
    mapping(uint256 => CycleStats) public cycleStats;
    
    // Active staker list
    address[] public stakingUsers;
    mapping(address => uint256) public stakingUserIndex; // Index of user in stakingUsers + 1 (0 means not in array)
    
    // Events
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event StakingUpdated(address indexed user, uint256 amount, uint256 cycle);
    event CycleUpdated(uint256 oldCycle, uint256 newCycle, uint256 processedCycles);
    event RewardPoolLow(uint256 requested, uint256 available);
    event ContractRenounced(address indexed previousOwner);
    event EligibleAmountUpdated(address indexed user, uint256 oldEligibleAmount, uint256 newEligibleAmount);
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
        
        // Initialize cycle and timestamp
        currentCycle = 1;
        lastUpdateTimestamp = block.timestamp;
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
                distributionAmount = (petWorldBalance * DISTRIBUTION_RATIO) / PRECISION_FACTOR;
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
     * @dev Update user rewards by calculating rewards between cycles
     * @param user User address to update
     * @return rewards Amount of rewards calculated
     */
    function _updateUserRewardsInternal(address user) internal returns (uint256 rewards) {
        StakingInfo storage stakingInfo = userStakingInfo[user];
        
        // If user has no stake or is already up-to-date, return 0
        if (stakingInfo.stakedAmount == 0 || stakingInfo.lastClaimedCycle >= currentCycle) {
            return 0;
        }
        
        // Update eligible amount before calculating rewards
        _updateEligibleAmount(stakingInfo);
        
        // Calculate rewards
        uint256 fromCycle = stakingInfo.lastClaimedCycle + 1;
        uint256 toCycle = currentCycle;
        
        rewards = _calculateRewardsBetweenCycles(user, fromCycle, toCycle);
        
        // Update last claimed cycle
        stakingInfo.lastClaimedCycle = currentCycle;
        stakingInfo.pendingRewards += rewards;
        
        return rewards;
    }
    
    /**
     * @dev Calculate rewards for a user within a specific cycle range
     * @param user User address
     * @param fromCycle Starting cycle
     * @param toCycle Ending cycle
     * @return Total rewards within the cycle range
     */
    function _calculateRewardsBetweenCycles(
        address user, 
        uint256 fromCycle, 
        uint256 toCycle
    ) public view returns (uint256) {
        StakingInfo storage stakingInfo = userStakingInfo[user];
        uint256 totalRewards = 0;
        
        // Check valid input parameters
        if (stakingInfo.rewardEligibleAmount == 0 || fromCycle > toCycle) {
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
            
            // Calculate the user's rewards for this cycle based on the eligible amount
            uint256 cycleReward = (stakingInfo.rewardEligibleAmount * stats.petWorldDistributed) / stats.totalStakedTokens;
            
            totalRewards += cycleReward;
        }
        
        return totalRewards;
    }

    /**
     * @dev Add user to staking users array if not already present
     * @param user Address of the user to add
     */
    function _addToStakingUsers(address user) internal {
        if (stakingUserIndex[user] == 0) {
            stakingUsers.push(user);
            stakingUserIndex[user] = stakingUsers.length;
        }
    }
    
    /**
     * @dev Remove user from staking users array
     * @param user Address of the user to remove
     */
    function _removeFromStakingUsers(address user) internal {
        uint256 index = stakingUserIndex[user];
        
        // If user is in the array (index > 0 because we store index+1)
        if (index > 0) {
            uint256 lastIndex = stakingUsers.length - 1;
            address lastUser = stakingUsers[lastIndex];
            
            // If not the last element, swap with the last one
            if (index - 1 != lastIndex) {
                stakingUsers[index - 1] = lastUser;
                stakingUserIndex[lastUser] = index;
            }
            
            // Remove the last element
            stakingUsers.pop();
            stakingUserIndex[user] = 0;
        }
    }

    /**
     * @dev Stake tokens
     * @param amount Amount of PetWorld to stake
     */
    function stake(uint256 amount) public nonReentrant {
        // Checks
        require(amount > 0, "Amount must be greater than zero");
        
        // Update cycle
        _updateCycle();
        
        address user = msg.sender;
        StakingInfo storage stakingInfo = userStakingInfo[user];
        
        // Effects - calculate pending rewards
        _updateUserRewardsInternal(user);
        
        // Update eligible amount for existing deposit if 24 hours have passed
        if (block.timestamp >= stakingInfo.lastDepositTimestamp + 24 hours) {
            stakingInfo.rewardEligibleAmount = stakingInfo.stakedAmount;
        }
        
        // Effects - update state before interactions
        // Update user's staking information
        stakingInfo.stakedAmount += amount;
        if (stakingInfo.lastClaimedCycle == 0) {
            stakingInfo.lastClaimedCycle = currentCycle;
        }
        
        // Update deposit timestamp for the new deposit
        stakingInfo.lastDepositTimestamp = block.timestamp;
        
        // Add user to staking users if not already present
        _addToStakingUsers(user);
        
        // Update the total staked amount for the current cycle
        cycleStats[currentCycle].totalStakedTokens += amount;
        
        // Interactions - external calls
        IERC20(petWorldToken).safeTransferFrom(user, address(this), amount);
        
        emit Staked(user, amount);
        emit StakingUpdated(user, stakingInfo.stakedAmount, currentCycle);
    }
    
    /**
     * @dev Withdraw staked tokens
     * @param amount Amount of tokens to withdraw, 0 means withdraw all
     */
    function withdraw(uint256 amount) public nonReentrant {
        address user = msg.sender;
        StakingInfo storage stakingInfo = userStakingInfo[user];
        
        // Checks
        require(stakingInfo.stakedAmount > 0, "No staked tokens");
        
        // If amount is 0, withdraw all
        uint256 withdrawAmount = amount;
        if (withdrawAmount == 0) {
            withdrawAmount = stakingInfo.stakedAmount;
        } else {
            require(withdrawAmount > 0, "Amount must be greater than zero");
            require(withdrawAmount <= stakingInfo.stakedAmount, "Amount exceeds staked balance");
        }
        
        // Update cycle
        _updateCycle();
        
        // Update eligible amount before calculating rewards
        _updateEligibleAmount(stakingInfo);
        
        // Effects - calculate and record pending rewards
        _updateUserRewardsInternal(user);
        
        // Effects - update state before interactions
        // Remember the original staked amount before deducting withdrawal
        uint256 originalStakedAmount = stakingInfo.stakedAmount + withdrawAmount;
        
        // Update user's staking information
        stakingInfo.stakedAmount -= withdrawAmount;
        
        // Calculate the non-eligible amount (tokens staked less than 24 hours)
        uint256 nonEligibleAmount = originalStakedAmount - stakingInfo.rewardEligibleAmount;
        
        // Prioritize withdrawing non-eligible tokens first
        if (withdrawAmount <= nonEligibleAmount) {
            // If withdrawal amount is less than or equal to non-eligible amount, 
            // no need to modify rewardEligibleAmount
            // Just deduct from non-eligible tokens
        } else {
            // If withdrawal amount is greater than non-eligible amount
            // Deduct the remainder from eligible amount
            uint256 remainingToWithdraw = withdrawAmount - nonEligibleAmount;
            if (stakingInfo.rewardEligibleAmount >= remainingToWithdraw) {
                stakingInfo.rewardEligibleAmount -= remainingToWithdraw;
            } else {
                stakingInfo.rewardEligibleAmount = 0;
            }
        }
        
        // Update the total staked amount for the current cycle
        uint256 cycleStakedTokens = cycleStats[currentCycle].totalStakedTokens;
        cycleStats[currentCycle].totalStakedTokens = (withdrawAmount >= cycleStakedTokens) 
            ? 0 
            : cycleStakedTokens - withdrawAmount;
        
        // If the user has no remaining stake, remove them from the active staker list
        if (stakingInfo.stakedAmount == 0) {
            _removeFromStakingUsers(user);
        }
        
        // Interactions - external calls
        IERC20(petWorldToken).safeTransfer(user, withdrawAmount);
        
        emit Withdrawn(user, withdrawAmount);
        emit StakingUpdated(user, stakingInfo.stakedAmount, currentCycle);
    }
    
    /**
     * @dev Claim rewards
     */
    function claimRewards() public nonReentrant {
        address user = msg.sender;
        
        // Update cycle
        _updateCycle();
        
        // Update eligible amount before calculating rewards
        StakingInfo storage stakingInfo = userStakingInfo[user];
        _updateEligibleAmount(stakingInfo);
        
        // Effects - calculate rewards
        _updateUserRewardsInternal(user);
        
        uint256 totalRewards = stakingInfo.pendingRewards;
        
        // Checks
        require(totalRewards > 0, "No rewards to claim");
        
        // Effects - update state before interactions
        // Reset pending rewards
        stakingInfo.pendingRewards = 0;
        
        // Ensure the reward pool has enough balance
        if (totalRewards > rewardPoolBalance) {
            emit RewardPoolLow(totalRewards, rewardPoolBalance);
            totalRewards = rewardPoolBalance;
        }
        
        // Deduct the distributed rewards from the reward pool
        rewardPoolBalance -= totalRewards;
        
        // Interactions - external calls
        IERC20(petWorldToken).safeTransfer(user, totalRewards);
        
        emit RewardsClaimed(user, totalRewards);
    }
    
    /**
     * @dev Update user's staking information and rewards
     * This function can be called by anyone to update the user's reward status
     * @param user User address
     */
    function updateUserRewards(address user) public {
        // If the user has no stake, return directly
        if (userStakingInfo[user].stakedAmount == 0) {
            return;
        }
        
        // Update cycle
        _updateCycle();
        
        // Update eligible amount before calculating rewards
        StakingInfo storage stakingInfo = userStakingInfo[user];
        _updateEligibleAmount(stakingInfo);
        
        // Calculate new rewards
        uint256 newRewards = _updateUserRewardsInternal(user);
        
        if (newRewards > 0) {
            emit StakingUpdated(user, userStakingInfo[user].stakedAmount, currentCycle);
        }
    }

    // ==== Management Functions ====
    
    /**
     * @dev Set PetWorldToken address
     * @param _petWorldToken New PetWorldToken address
     */
    function setPetWorldToken(address _petWorldToken) external onlyOwner {
        require(_petWorldToken != address(0), "PetWorld token address cannot be zero");
        petWorldToken = _petWorldToken;
    }
    
    /**
     * @dev Get count of active stakers
     * @return Number of active stakers
     */
    function getActiveStakersCount() external view returns (uint256) {
        return stakingUsers.length;
    }
    
    /**
     * @dev Get active stakers with pagination
     * @param start Starting index
     * @param count Number of addresses to return
     * @return Array of active staker addresses
     */
    function getActiveStakers(uint256 start, uint256 count) external view returns (address[] memory) {
        uint256 totalCount = stakingUsers.length;
        
        if (start >= totalCount || count == 0) {
            return new address[](0);
        }
        
        uint256 end = start + count;
        if (end > totalCount) {
            end = totalCount;
        }
        
        uint256 resultLength = end - start;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = stakingUsers[start + i];
        }
        
        return result;
    }

    // Transfer contract ownership
    function transferContractOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        _transferOwnership(newOwner);
    }
    
    // Renounce contract ownership
    function renounceContractOwnership() public onlyOwner {
        _transferOwnership(address(0));
        emit ContractRenounced(msg.sender);
    }

    /**
     * @dev Update the eligible amount for rewards
     * This function checks if the current deposit has been staked for over 24 hours
     * and updates the rewardEligibleAmount accordingly
     * @param stakingInfo The staking position to update
     */
    function _updateEligibleAmount(StakingInfo storage stakingInfo) internal {
        // Check if 24 hours have passed since the last deposit
        if (block.timestamp >= stakingInfo.lastDepositTimestamp + 24 hours) {
            uint256 oldEligibleAmount = stakingInfo.rewardEligibleAmount;
            // If 24 hours have passed, the entire staked amount is eligible for rewards
            stakingInfo.rewardEligibleAmount = stakingInfo.stakedAmount;
            
            // Emit event if the eligible amount changed
            if (oldEligibleAmount != stakingInfo.rewardEligibleAmount) {
                emit EligibleAmountUpdated(msg.sender, oldEligibleAmount, stakingInfo.rewardEligibleAmount);
            }
        }
    }


} 