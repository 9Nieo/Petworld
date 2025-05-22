// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PwUSD} from "./PwUSD.sol";
import {PwPointManager} from "./PwPointManager.sol";

/**
 * @title PWUSDStaking
 * @dev Contract for staking stablecoins to earn PWUSD and PwPoint rewards
 */
contract PwUSDStaking is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant CYCLE_DURATION = 1 days;  // Each cycle lasts for 1 day
    uint256 public constant PWPOINT_REWARD_RATE = 2;  // 2 PwPoint for every 10 stablecoins per cycle
    uint256 public constant PRECISION_FACTOR = 10 * 10**18;  // Precision factor for reward calculations
    uint256 public constant MAX_CYCLE_UPDATES = 100;  // Maximum number of cycles to update at once
    uint256 public constant MIN_STAKE_MULTIPLE = 10 * 10**18;  // Minimum staking amount multiple (10 USD)
    
    // Contract addresses
    address public pwusdToken;         // PWUSD token address
    address payable public pwpointManager;     // PwPointManager contract address
    
    
    // Cycle-related variables
    uint256 public currentCycle;       // Current cycle
    uint256 public lastUpdateTimestamp; // Last update timestamp
    
    uint256 public totalStakedAmount;  
    uint256 public totalClaimedPwPoints; 
    
    // Supported stablecoin list
    mapping(address => bool) public supportedStableCoins;
    address[] public supportedStableCoinList;
    
    // Historical supported stablecoin tracking for withdrawals
    mapping(address => bool) public historicalSupportedStableCoins;
    
    // Staking information
    struct StakingInfo {
        uint256 stakedAmount;                  // Amount staked
        address stableCoin;                    // Type of stablecoin staked
        uint256 lastClaimedCycle;              // Last cycle in which rewards were claimed
        uint256 recordId;                      // Unique identifier for the staking record
        uint256 pendingRewards;                // Pending PwPoint rewards not yet claimed
        uint256 stakingStartTime;              // Timestamp when staking began
    }
    
    // Cycle statistics
    struct CycleStats {
        uint256 totalStakedTokens;             // Total staked tokens for the cycle (in USD)
        bool distributionCalculated;           // Whether distribution for the cycle has been calculated
    }
    
    // User's staking information mapping
    mapping(address => StakingInfo[]) public userStakingInfo;
    
    // Track staking records by ID - necessary for individual record management
    mapping(address => mapping(uint256 => uint256)) public userStakingRecordIndex; // user => recordId => array index
    mapping(address => mapping(uint256 => bool)) public userHasStakingRecord; // user => recordId => exists
    uint256 private nextRecordId = 1; // Global record ID counter
    
    // Active staker tracking
    mapping(address => bool) public isActiveStaker;
    mapping(address => uint256) public userStakingRecordCount; // Track the number of staking records per user
    
    // Cycle statistics information
    mapping(uint256 => CycleStats) public cycleStats;
    
    // Events
    event Staked(address indexed user, address indexed stableCoin, uint256 amount, uint256 pwusdMinted, uint256 recordId);
    event Withdrawn(address indexed user, address indexed stableCoin, uint256 amount, uint256 pwusdBurned, uint256 recordId);
    event RewardsClaimed(address indexed user, uint256 amount, uint256 recordId);
    event CycleUpdated(uint256 oldCycle, uint256 newCycle, uint256 updatedCycles);
    event ClaimFailed(address indexed user, uint256 amount, string reason, uint256 recordId);
    event StableCoinAdded(address indexed stableCoin);
    event StableCoinRemoved(address indexed stableCoin);
    event ContractRenounced(address indexed previousOwner);
    event StakingRecordRemoved(address indexed user, uint256 recordId);
    
    /**
     * @dev Constructor
     * @param _pwusdToken PWUSD token address
     * @param _pwpointManager PwPointManager contract address
     */
    constructor(
        address _pwusdToken,
        address payable _pwpointManager
    ) Ownable(msg.sender) {
        require(_pwusdToken != address(0), "PWUSD token address cannot be zero");
        require(_pwpointManager != address(0), "PwPointManager address cannot be zero");
        
        pwusdToken = _pwusdToken;
        pwpointManager = _pwpointManager;
        
        // Initialize cycle and timestamp
        currentCycle = 1;
        lastUpdateTimestamp = block.timestamp;
        
        totalStakedAmount = 0;
        totalClaimedPwPoints = 0;
        nextRecordId = 1;
    }


    /**
     * @dev Add supported stablecoin
     * @param stableCoin Stablecoin address
     */
    function addSupportedStableCoin(address stableCoin) public onlyOwner {
        require(stableCoin != address(0), "StableCoin address cannot be zero");
        require(!supportedStableCoins[stableCoin], "StableCoin already supported");
        
        supportedStableCoins[stableCoin] = true;
        historicalSupportedStableCoins[stableCoin] = true; 
        supportedStableCoinList.push(stableCoin);
        
        emit StableCoinAdded(stableCoin);
    }
    
    /**
     * @dev Remove supported stablecoin
     * @param stableCoin Stablecoin address to remove
     */
    function removeSupportedStableCoin(address stableCoin) public onlyOwner {
        require(stableCoin != address(0), "StableCoin address cannot be zero");
        require(supportedStableCoins[stableCoin], "StableCoin not currently supported");
        
        supportedStableCoins[stableCoin] = false;
        
        // Remove from the supported stablecoin list
        for (uint256 i = 0; i < supportedStableCoinList.length; i++) {
            if (supportedStableCoinList[i] == stableCoin) {
                // Move the last element to this position and shrink the array
                supportedStableCoinList[i] = supportedStableCoinList[supportedStableCoinList.length - 1];
                supportedStableCoinList.pop();
                break;
            }
        }
        
        emit StableCoinRemoved(stableCoin);
    }
    
    /**
     * @dev Update the current cycle
     * Calculate the actual current cycle based on elapsed time
     * Limits the number of cycles that can be updated at once
     */
    function _updateCycle() public {
        uint256 elapsedTime = block.timestamp - lastUpdateTimestamp;
        uint256 elapsedCycles = elapsedTime / CYCLE_DURATION;
        
        // Limit the number of cycles to update to prevent excessive gas consumption
        if (elapsedCycles > MAX_CYCLE_UPDATES) {
            elapsedCycles = MAX_CYCLE_UPDATES;
        }
        
        if (elapsedCycles > 0) {
            uint256 oldCycle = currentCycle;
            
            // Update data for each new cycle
            for (uint256 i = 1; i <= elapsedCycles; i++) {
                uint256 cycleToUpdate = currentCycle + i;
                
                // If it's the first cycle, set total staked amount to the current cycle's total staked amount
                if (i == 1) {
                    cycleStats[cycleToUpdate].totalStakedTokens = cycleStats[currentCycle].totalStakedTokens;
                } else {
                    // For subsequent cycles, set total staked amount to the previous cycle's total staked amount
                    cycleStats[cycleToUpdate].totalStakedTokens = cycleStats[currentCycle + i - 1].totalStakedTokens;
                }
                
                // Mark that the distribution for this cycle has been calculated
                cycleStats[cycleToUpdate].distributionCalculated = true;
            }
            
            // Update the current cycle
            currentCycle += elapsedCycles;
            
            // If we've capped the cycle updates, adjust the lastUpdateTimestamp relative to 
            // the cycles we've actually processed, not the full elapsed time
            if (elapsedCycles == MAX_CYCLE_UPDATES) {
                // Optimize by avoiding multiplication with large numbers
                lastUpdateTimestamp += MAX_CYCLE_UPDATES * CYCLE_DURATION;
            } else {
                lastUpdateTimestamp = block.timestamp;
            }
            
            emit CycleUpdated(oldCycle, currentCycle, elapsedCycles);
        }
    }
    
    /**
     * @dev Calculate rewards for a staking position
     * @param stakingInfo The staking position
     * @return (rewards, actualCurrentCycle) Calculated rewards and the current cycle used for calculation
     */
    function _calculateRewards(StakingInfo storage stakingInfo) private view returns (uint256, uint256) {
        // Calculate actual cycles (based on current time)
        uint256 elapsedTime = block.timestamp - lastUpdateTimestamp;
        uint256 elapsedCycles = elapsedTime / CYCLE_DURATION;
        uint256 actualCurrentCycle = currentCycle + elapsedCycles;
        
        uint256 newRewards = 0;
        if (stakingInfo.lastClaimedCycle < actualCurrentCycle) {
            uint256 cyclesPassed = actualCurrentCycle - stakingInfo.lastClaimedCycle;
            
            newRewards = ((stakingInfo.stakedAmount / PRECISION_FACTOR) * PWPOINT_REWARD_RATE * cyclesPassed);
        }
        
        return (newRewards, actualCurrentCycle);
    }
    
    /**
     * @dev Stake stablecoins
     * @param stableCoin Stablecoin address
     * @param amount Amount to stake
     * @return recordId The unique ID assigned to this staking record
     */
    function stake(address stableCoin, uint256 amount) public nonReentrant returns (uint256) {
        // Checks
        require(supportedStableCoins[stableCoin], "StableCoin not supported");
        require(amount > 0, "Amount must be greater than zero");
        // Using pre-computed constant to avoid runtime calculations
        require(amount % MIN_STAKE_MULTIPLE == 0, "Amount must be a multiple of 10 USD");
        
        address user = msg.sender;
        
        // Check the user's allowance
        uint256 allowance = IERC20(stableCoin).allowance(user, address(this));
        require(allowance >= amount, "Insufficient allowance");
        
        // Check the user's balance
        uint256 userBalance = IERC20(stableCoin).balanceOf(user);
        require(userBalance >= amount, "Insufficient balance");
        
        // Update cycle
        _updateCycle();
        
        // Calculate the equivalent PWUSD amount
        uint256 pwusdAmount = amount;
        
        // Create a new staking record with a unique ID
        uint256 recordId = nextRecordId++;
        uint256 stakingIndex = userStakingInfo[user].length;
        
        // Create the new staking record
        userStakingInfo[user].push(StakingInfo({
            stakedAmount: amount,
            stableCoin: stableCoin,
            lastClaimedCycle: currentCycle + 1,
            recordId: recordId,
            pendingRewards: 0,
            stakingStartTime: block.timestamp
        }));
        
        // Update mapping to track the record
        userStakingRecordIndex[user][recordId] = stakingIndex;
        userHasStakingRecord[user][recordId] = true;
        userStakingRecordCount[user]++;
        
        // Mark as active staker
        isActiveStaker[user] = true;
        
        // Update the total staked amount for the current cycle
        cycleStats[currentCycle].totalStakedTokens += amount;
        totalStakedAmount += amount;
        
        // Interactions - External calls
        // Transfer the user's stablecoins to the contract
        uint256 balanceBefore = IERC20(stableCoin).balanceOf(address(this));
        IERC20(stableCoin).safeTransferFrom(user, address(this), amount);
        uint256 balanceAfter = IERC20(stableCoin).balanceOf(address(this));
        
        // Verify the transfer was successful by checking the contract's balance change
        require(balanceAfter >= balanceBefore + amount, "Token transfer failed");
        
        // Mint PWUSD for the user
        PwUSD(pwusdToken).mint(user, pwusdAmount);
        
        emit Staked(user, stableCoin, amount, pwusdAmount, recordId);
        
        return recordId;
    }
    
    
    /**
     * @dev Physically remove a staking record from the user's array
     * @param user The user address
     * @param recordId The ID of the staking record to remove
     */
    function _removeStakingRecord(address user, uint256 recordId) private {
        require(userHasStakingRecord[user][recordId], "Record does not exist");
        
        uint256 index = userStakingRecordIndex[user][recordId];
        uint256 lastIndex = userStakingInfo[user].length - 1;
        
        // If this is not the last element, move the last element to this position
        if (index != lastIndex) {
            StakingInfo storage lastRecord = userStakingInfo[user][lastIndex];
            userStakingInfo[user][index] = lastRecord;
            userStakingRecordIndex[user][lastRecord.recordId] = index;
        }
        
        // Remove the last element
        userStakingInfo[user].pop();
        
        // Update mappings
        delete userStakingRecordIndex[user][recordId];
        delete userHasStakingRecord[user][recordId];
        
        // Decrease counter
        userStakingRecordCount[user]--;
        
        // If no more records, mark user as inactive
        if (userStakingRecordCount[user] == 0) {
            isActiveStaker[user] = false;
        }
        
        emit StakingRecordRemoved(user, recordId);
    }
    
    /**
     * @dev Withdraw staked stablecoins
     * @param recordId The unique ID of the staking record
     * @param amount Amount to withdraw, 0 means withdraw all
     */
    function withdraw(uint256 recordId, uint256 amount) public nonReentrant {
        // Using pre-computed constant to avoid runtime calculations
        require(amount % MIN_STAKE_MULTIPLE == 0, "Amount must be a multiple of 10 USD");
        // Checks
        address user = msg.sender;
        require(userHasStakingRecord[user][recordId], "No staking record found with this ID");
        
        uint256 stakingIndex = userStakingRecordIndex[user][recordId];
        StakingInfo storage stakingInfo = userStakingInfo[user][stakingIndex];
        address stableCoin = stakingInfo.stableCoin;
        
        require(historicalSupportedStableCoins[stableCoin], "StableCoin never supported");
        
        require(amount <= stakingInfo.stakedAmount, "Amount exceeds staked balance");
        
        // Check contract balance
        uint256 contractBalance = IERC20(stableCoin).balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient contract balance");
        
        // Calculate the amount of PWUSD to burn
        uint256 pwusdAmount = amount;
        
        // Ensure the user has enough PWUSD
        uint256 pwusdBalance = IERC20(pwusdToken).balanceOf(user);
        require(pwusdBalance >= pwusdAmount, "Insufficient PWUSD balance");
        
        // Update cycle
        _updateCycle();
        
        // Calculate and update rewards
        (uint256 newRewards, uint256 actualCurrentCycle) = _calculateRewards(stakingInfo);
        
        // Add new rewards to pending rewards
        if (newRewards > 0) {
            stakingInfo.pendingRewards += newRewards;
        }
        
        // Process withdrawal
        stakingInfo.stakedAmount -= amount;
        
        // Consider it a full withdrawal if the remaining amount is very small (less than 0.01 USD)
        // Using 10**16 directly instead of calculating 0.01 * 10**18 to save gas
        bool isFullWithdrawal = stakingInfo.stakedAmount == 0 || stakingInfo.stakedAmount < 10**16;
        
        if (!isFullWithdrawal&&stakingInfo.lastClaimedCycle < actualCurrentCycle) {
            // Update the last claimed cycle
            stakingInfo.lastClaimedCycle = actualCurrentCycle;
        }
        
        // Update global staked amount
        if (amount <= totalStakedAmount) {
            totalStakedAmount -= amount;
        } else {
            totalStakedAmount = 0;
        }
        
        // Decrease the total staked amount for the current cycle
        if (amount <= cycleStats[currentCycle].totalStakedTokens) {
            cycleStats[currentCycle].totalStakedTokens -= amount;
        } else {
            cycleStats[currentCycle].totalStakedTokens = 0;
        }
        
        // Interactions - External calls
        // Burn the user's PWUSD
        IERC20(pwusdToken).safeTransferFrom(user, address(this), pwusdAmount);
        PwUSD(pwusdToken).burn(pwusdAmount);
        
        // Transfer stablecoins back to the user
        IERC20(stableCoin).safeTransfer(user, amount);
        
        // If there are pending rewards on full withdrawal, claim them first
        if (isFullWithdrawal && stakingInfo.pendingRewards > 0) {
            uint256 pendingRewards = stakingInfo.pendingRewards;
            
            // Try to claim the rewards
            try PwPointManager(pwpointManager).claimNftReward(user, pendingRewards, pendingRewards) {
                totalClaimedPwPoints += pendingRewards;
                emit RewardsClaimed(user, pendingRewards, recordId);
                stakingInfo.pendingRewards = 0;
            } catch Error(string memory reason) {
                emit ClaimFailed(user, pendingRewards, reason, recordId);
            } catch (bytes memory /* lowLevelData */) {
                emit ClaimFailed(user, pendingRewards, "Unknown error", recordId);
            }
        }
        
        // If full withdrawal, physically remove the record
        if (isFullWithdrawal) {
            // Physically remove the record
            _removeStakingRecord(user, recordId);
        }
        
        emit Withdrawn(user, stableCoin, amount, pwusdAmount, recordId);
    }
    
    /**
     * @dev Claim PwPoint rewards
     * @param recordId The unique ID of the staking record to claim rewards from
     */
    function claimRewards(uint256 recordId) public nonReentrant {
        // Checks
        address user = msg.sender;
        require(userHasStakingRecord[user][recordId], "No staking record found with this ID");
        // Update cycle
        _updateCycle();
        uint256 stakingIndex = userStakingRecordIndex[user][recordId];
        StakingInfo storage stakingInfo = userStakingInfo[user][stakingIndex];
        
        // Ensure minimum staking period of 24 hours has passed
        require(block.timestamp >= stakingInfo.stakingStartTime + CYCLE_DURATION, "Minimum staking period not met");
        require(stakingInfo.lastClaimedCycle < currentCycle, "Rewards already claimed for this cycle");
        // Calculate new rewards to add to pending
        (uint256 newRewards, uint256 actualCurrentCycle) = _calculateRewards(stakingInfo);
        
        // Add new rewards to pending
        if (newRewards > 0) {
            stakingInfo.pendingRewards += newRewards;
        }
        
        // Get total pending rewards
        uint256 pendingRewards = stakingInfo.pendingRewards;
        
        // Ensure there are rewards to claim
        require(pendingRewards > 0, "No rewards to claim");
        
        // Reset pending rewards and update the last claimed cycle
        stakingInfo.pendingRewards = 0;
        stakingInfo.lastClaimedCycle = actualCurrentCycle;
        
        // Interactions - External calls
        // Transfer PwPoint and PwBounty to the user through PwPointManager
        try PwPointManager(pwpointManager).claimNftReward(user, pendingRewards, pendingRewards) {
            totalClaimedPwPoints += pendingRewards;
            emit RewardsClaimed(user, pendingRewards, recordId);
        } catch Error(string memory reason) {
            // If claim fails, restore pending rewards
            stakingInfo.pendingRewards = pendingRewards;
            emit ClaimFailed(user, pendingRewards, reason, recordId);
        } catch (bytes memory /* lowLevelData */) {
            // If claim fails, restore pending rewards
            stakingInfo.pendingRewards = pendingRewards;
            emit ClaimFailed(user, pendingRewards, "Unknown error", recordId);
        }
    }
    
    /**
     * @dev Claim all PwPoint rewards from all staked records
     * This function allows users to claim rewards from all their staked positions at once
     */
    function claimAllRewards() public nonReentrant {
        // Checks
        address user = msg.sender;
        require(isActiveStaker[user], "User has no active staking");
        
        // Update cycle
        _updateCycle();
        
        // Variable to track total rewards across all stakes
        uint256 totalRewardsToTransfer = 0;
        
        // Store the indices of records with rewards to update
        uint256[] memory recordsToUpdate = new uint256[](userStakingInfo[user].length);
        uint256 recordCount = 0;
        
        // Process all staking records to calculate rewards
        for (uint256 i = 0; i < userStakingInfo[user].length; i++) {
            StakingInfo storage stakingInfo = userStakingInfo[user][i];
            
            // Only include records that meet the minimum staking period of 24 hours
            if (block.timestamp >= stakingInfo.stakingStartTime + CYCLE_DURATION && stakingInfo.lastClaimedCycle < currentCycle) {
                // Calculate new rewards
                (uint256 newRewards, uint256 actualCurrentCycle) = _calculateRewards(stakingInfo);
                
                // Add new rewards to pending rewards
                if (newRewards > 0) {
                    stakingInfo.pendingRewards += newRewards;
                }
                
                // If there are any pending rewards, add to the total
                if (stakingInfo.pendingRewards > 0) {
                    totalRewardsToTransfer += stakingInfo.pendingRewards;
                    recordsToUpdate[recordCount] = i;
                    recordCount++;
                }
            }
        }
        
        // Ensure there are rewards to claim
        require(totalRewardsToTransfer > 0, "No rewards to claim");
        
        // Prepare to clear pending rewards and update cycles
        bool claimSuccessful = false;
        
        // Interactions - External calls
        // Transfer all PwPoint and PwBounty rewards to the user through PwPointManager
        try PwPointManager(pwpointManager).claimNftReward(user, totalRewardsToTransfer, totalRewardsToTransfer) {
            claimSuccessful = true;
            totalClaimedPwPoints += totalRewardsToTransfer;
            
            emit RewardsClaimed(user, totalRewardsToTransfer, 0); // 0 as recordId indicates aggregated claim
        } catch Error(string memory reason) {
            emit ClaimFailed(user, totalRewardsToTransfer, reason, 0);
        } catch (bytes memory /* lowLevelData */) {
            emit ClaimFailed(user, totalRewardsToTransfer, "Unknown error", 0);
        }
        
        // If the claim was successful, clear all pending rewards
        if (claimSuccessful) {
            for (uint256 j = 0; j < recordCount; j++) {
                uint256 i = recordsToUpdate[j];
                StakingInfo storage stakingInfo = userStakingInfo[user][i];
                
                // Calculate the actual current cycle again to ensure it's up to date
                uint256 elapsedTime = block.timestamp - lastUpdateTimestamp;
                uint256 elapsedCycles = elapsedTime / CYCLE_DURATION;
                uint256 actualCurrentCycle = currentCycle + elapsedCycles;
                
                // Reset pending rewards and update claimed cycle
                stakingInfo.pendingRewards = 0;
                stakingInfo.lastClaimedCycle = actualCurrentCycle;
            }
        }
    }
    
} 