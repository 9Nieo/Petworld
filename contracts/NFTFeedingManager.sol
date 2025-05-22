// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PwPointManager} from "./PwPointManager.sol";
import {NFTManager} from "./NFTManager.sol";

contract NFTFeedingManager is Ownable, ReentrancyGuard {
    // Constant definitions
    uint256 public constant MAX_FEEDING_HOURS = 168;      // Maximum feeding time is 7 days (168 hours)
    uint256 public constant SECONDS_PER_CYCLE = 3600;     // Seconds per cycle (1 hour = 3600 seconds)
    uint256 public constant DEFAULT_FEEDING_HOURS = 48;   // Default feeding time of 48 hours
    uint256 public constant HOURS_PER_CYCLE = 1;          // Hours per cycle
    
    // Level upgrade thresholds
    uint256 public constant LEVEL_2_THRESHOLD = 1000;     // 1000 PWFOOD to reach level 2
    uint256 public constant LEVEL_3_THRESHOLD = 3000;     // 3000 PWFOOD to reach level 3
    uint256 public constant LEVEL_4_THRESHOLD = 10000;    // 10000 PWFOOD to reach level 4
    uint256 public constant LEVEL_5_THRESHOLD = 30000;    // 30000 PWFOOD to reach level 5
    uint256 public constant MAX_LEVEL = 5;                // Maximum level
    
    // Reward configuration
    struct RewardConfig {
        uint256 pwpotReward;
        uint256 pwbotReward;
    }
    
    mapping(uint256 => RewardConfig) public rewardConfigs;
    
    // Contract addresses
    address public nftLotteryManager;
    address public pwfoodToken;
    PwPointManager public pwpointManager;
    address public pwfoodReceiver;  // PWFOOD token receiver address
    address public pwnft;          // PWNFT contract address
    NFTManager public nftManager;  // NFTManager contract reference
    
    // Authorized address mapping
    mapping(address => bool) public authorizedRegistrars;
    
    // NFT feeding data structure
    struct FeedingData {
        uint256 feedingHours;        // Hours fed
        uint256 lastClaimTime;       // Timestamp of last reward claim
        uint256 lastFeedTime;        // Timestamp of last feeding
        uint256 quality;             // NFT quality
        bool isActive;               // Is active
        uint256 accumulatedCycles;   // Accumulated unclaimed reward cycles
        uint256 level;               // NFT level (1-5)
        uint256 accumulatedFood;     // Total accumulated PWFOOD
    }
    
    // All NFT feeding data stored uniformly
    mapping(uint256 => FeedingData) public nftFeeding;
    
    // Event definitions
    event NFTFed(address indexed user, uint256[] tokenIds, uint256 foodAmount, uint256 cyclesAdded);
    event RewardsClaimed(address indexed user, uint256[] tokenIds, uint256 totalPwpotRewards, uint256 totalPwbotRewards);
    event NFTRegistered(uint256 indexed tokenId, uint256 quality, uint256 feedingHours);
    event RegistrarAuthorized(address indexed registrar);
    event RegistrarRevoked(address indexed registrar);
    event ConfigUpdated(uint256 indexed quality, uint256 pwpotReward, uint256 pwbotReward);
    event ContractAddressUpdated(string indexed contractType, address newAddress);
    event NFTLevelUp(uint256 indexed tokenId, uint256 newLevel, uint256 accumulatedFood);
    
    constructor() Ownable(msg.sender) {
        pwfoodReceiver = address(this);  // Default receiver address is the current contract     
        // Initialize reward configuration
        rewardConfigs[0] = RewardConfig(1, 2);      // Normal
        rewardConfigs[1] = RewardConfig(10, 20);    // Good
        rewardConfigs[2] = RewardConfig(100, 200);  // Excellent
        rewardConfigs[3] = RewardConfig(800, 2000);  // Rare
        rewardConfigs[4] = RewardConfig(5000, 15000);// Legendary
    }
    function setNftLotteryManager(address _nftLotteryManager) public onlyOwner {
        require(_nftLotteryManager != address(0), "Invalid NFTLotteryManager address");
        nftLotteryManager = _nftLotteryManager;
        authorizedRegistrars[_nftLotteryManager] = true;
        emit ContractAddressUpdated("nftLotteryManager", _nftLotteryManager);
        emit RegistrarAuthorized(_nftLotteryManager);
    }
    function setPwfoodToken(address _pwfoodToken) public onlyOwner {
        require(_pwfoodToken != address(0), "Invalid PWFOOD token address");
        pwfoodToken = _pwfoodToken;
        emit ContractAddressUpdated("pwfoodToken", _pwfoodToken);
    }
    function setPwpointManager(address _pwpointManager) public onlyOwner {
        require(_pwpointManager != address(0), "Invalid PwPointManager address");
        pwpointManager = PwPointManager(payable(_pwpointManager));
        emit ContractAddressUpdated("pwpointManager", _pwpointManager);
    }
    
    // Update PWFOOD token receiver address
    function setPwfoodReceiver(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Invalid address");
        pwfoodReceiver = _newAddress;
        emit ContractAddressUpdated("pwfoodReceiver", _newAddress);
    }
    // Modifier: Check if NFT is registered
    modifier isNFTRegistered(uint256 tokenId) {
        require(nftFeeding[tokenId].isActive, "NFT not registered");
        _;
    }
    
    // Modifier: Check if authorized registrar
    modifier onlyAuthorizedRegistrar() {
        require(authorizedRegistrars[msg.sender], "Not authorized to register NFTs");
        _;
    }
    
    // Authorize registrar
    function authorizeRegistrar(address registrar) public onlyOwner {
        require(registrar != address(0), "Invalid registrar address");
        authorizedRegistrars[registrar] = true;
        emit RegistrarAuthorized(registrar);
    }
    
    // Revoke registrar authorization
    function revokeRegistrar(address registrar) public onlyOwner {
        require(registrar != address(0), "Invalid registrar address");
        authorizedRegistrars[registrar] = false;
        emit RegistrarRevoked(registrar);
    }
    
    // Register NFT (called by authorized contract)
    function registerNFT(uint256 tokenId) public onlyAuthorizedRegistrar {
        require(!nftFeeding[tokenId].isActive, "NFT already registered");
        require(address(nftManager) != address(0), "NFTManager not set");
        
        // Get the quality of the NFT from the NFTManager
        NFTManager.Quality qualityEnum = nftManager.tokenQuality(tokenId);
        uint256 quality = uint256(qualityEnum);
        require(quality <= 4, "Invalid quality value");
        
        uint256 currentTime = block.timestamp;
        
        nftFeeding[tokenId] = FeedingData({
            feedingHours: DEFAULT_FEEDING_HOURS,
            lastClaimTime: currentTime,
            lastFeedTime: currentTime,
            quality: quality,
            isActive: true,
            accumulatedCycles: 0,
            level: 1,                // Initialize at level 1
            accumulatedFood: 0       // Initialize accumulated food at 0
        });
        
        emit NFTRegistered(tokenId, quality, DEFAULT_FEEDING_HOURS);
    }
    
    // Check and update NFT level based on accumulated food
    function _checkAndUpdateLevel(uint256 tokenId) private {
        FeedingData storage data = nftFeeding[tokenId];
        
        // Don't process if already at max level
        if (data.level >= MAX_LEVEL) {
            return;
        }
        
        uint256 newLevel = data.level;
        
        // Check if NFT should level up
        if (data.level == 1 && data.accumulatedFood >= LEVEL_2_THRESHOLD) {
            newLevel = 2;
        }
        if (data.level == 2 && data.accumulatedFood >= LEVEL_3_THRESHOLD) {
            newLevel = 3;
        }
        if (data.level == 3 && data.accumulatedFood >= LEVEL_4_THRESHOLD) {
            newLevel = 4;
        }
        if (data.level == 4 && data.accumulatedFood >= LEVEL_5_THRESHOLD) {
            newLevel = 5;
        }
        
        // Update level if changed
        if (newLevel > data.level) {
            data.level = newLevel;
            emit NFTLevelUp(tokenId, newLevel, data.accumulatedFood);
        }
    }
    
    // Feed a single NFT
    function feedNFT(uint256 tokenId, uint256 foodAmount) public nonReentrant isNFTRegistered(tokenId) {
        require(foodAmount > 0, "Invalid food amount");
        require(foodAmount <= MAX_FEEDING_HOURS, "Food amount exceeds maximum limit");
        require(foodAmount % HOURS_PER_CYCLE == 0, "Food amount must be multiple of 1");
        FeedingData storage data = nftFeeding[tokenId];
        
        // Calculate the remaining effective feeding time
        uint256 remainingHours = _calculateRemainingFeedingHours(data);
        
        // Ensure that the new feeding time does not exceed the maximum limit
        require(remainingHours + foodAmount <= MAX_FEEDING_HOURS, "Exceeds max feeding hours");
        
        // Safety check: ensure token balance is sufficient
        IERC20 pwfoodContract = IERC20(pwfoodToken);
        require(pwfoodContract.balanceOf(msg.sender) >= foodAmount, "Insufficient PWFOOD balance");
        require(pwfoodContract.allowance(msg.sender, address(this)) >= foodAmount, "Insufficient PWFOOD allowance");
        
        // Transfer PWFOOD tokens to the specified receiver address
        require(pwfoodContract.transferFrom(msg.sender, pwfoodReceiver, foodAmount), "PWFOOD transfer failed");
        
        // Update accumulated cycles before updating feeding status
        _updateAccumulatedCycles(tokenId);
        
        // Update NFT feeding status based on remaining hours + new food
        data.feedingHours = remainingHours + foodAmount;
        data.lastFeedTime = block.timestamp;
        
        // Update accumulated food and check for level up
        data.accumulatedFood += foodAmount;
        _checkAndUpdateLevel(tokenId);
        
        uint256 cyclesAdded = foodAmount / HOURS_PER_CYCLE;
        
        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;
        emit NFTFed(msg.sender, tokenIds, foodAmount, cyclesAdded);
    }
    
    // Feed multiple NFTs
    function feedMultipleNFTs(uint256[] calldata tokenIds, uint256 totalFoodAmount) public nonReentrant {
        require(tokenIds.length > 0, "Empty token list");
        require(tokenIds.length <= 100, "Too many NFTs in single transaction");
        require(totalFoodAmount >= tokenIds.length * HOURS_PER_CYCLE, "Insufficient food amount");
        require(totalFoodAmount % HOURS_PER_CYCLE == 0, "Food amount must be multiple of 1");
        require(totalFoodAmount <= MAX_FEEDING_HOURS * tokenIds.length, "Food amount exceeds maximum limit");
        
        // Calculate the amount of food each NFT can receive, ensuring it's a multiple of 1
        uint256 foodPerNFT = (totalFoodAmount / tokenIds.length) / HOURS_PER_CYCLE * HOURS_PER_CYCLE;
        require(foodPerNFT >= HOURS_PER_CYCLE, "Each NFT must receive at least 1 food");
        
        // Safety check: ensure token balance is sufficient
        IERC20 pwfoodContract = IERC20(pwfoodToken);
        require(pwfoodContract.balanceOf(msg.sender) >= totalFoodAmount, "Insufficient PWFOOD balance");
        require(pwfoodContract.allowance(msg.sender, address(this)) >= totalFoodAmount, "Insufficient PWFOOD allowance");
        
        // Check for duplicate TokenIds before processing
        for (uint256 i = 0; i < tokenIds.length; i++) {
            for (uint256 j = i + 1; j < tokenIds.length; j++) {
                require(tokenIds[i] != tokenIds[j], "Duplicate NFT in list");
            }
        }
        
        // Check if all NFTs belong to the caller and have not exceeded the limit
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            
            // Verify NFT ownership
            require(IERC721(pwnft).ownerOf(tokenId) == msg.sender, "Not the current NFT owner");
            
            // Verify NFT registration status
            FeedingData storage data = nftFeeding[tokenId];
            require(data.isActive, "NFT not registered");
            
            // Calculate the remaining effective feeding time
            uint256 remainingHours = _calculateRemainingFeedingHours(data);
            require(remainingHours + foodPerNFT <= MAX_FEEDING_HOURS, "Exceeds max feeding hours");
        }
        
        // Calculate the actual amount of food needed
        uint256 actualFoodAmount = foodPerNFT * tokenIds.length;
        
        // Transfer PWFOOD tokens to the specified receiver address
        require(pwfoodContract.transferFrom(msg.sender, pwfoodReceiver, actualFoodAmount), "PWFOOD transfer failed");
        
        // Allocate feeding time
        uint256 cyclesAdded = foodPerNFT / HOURS_PER_CYCLE;
        uint256 currentTime = block.timestamp;
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            FeedingData storage data = nftFeeding[tokenId];
            
            // Update accumulated cycles
            _updateAccumulatedCycles(tokenId);
            
            // Calculate the remaining effective feeding time
            uint256 remainingHours = _calculateRemainingFeedingHours(data);
            
            // Update the feeding time to the remaining effective time + the new added time
            data.feedingHours = remainingHours + foodPerNFT;
            data.lastFeedTime = currentTime;
            
            // Update accumulated food and check for level up
            data.accumulatedFood += foodPerNFT;
            _checkAndUpdateLevel(tokenId);
        }
        
        emit NFTFed(msg.sender, tokenIds, actualFoodAmount, cyclesAdded);
    }
      
    /**
     * @dev Calculate valid claimable cycles
     * @notice This function handles time calculations with overflow protection and considers accumulated cycles
     */
    function _calculateValidClaimableCycles(FeedingData storage data) private view returns (uint256 validCycles, uint256 hoursToDeduct) {
        uint256 currentTime = block.timestamp;
        
        // Start with already accumulated cycles
        uint256 totalValidCycles = data.accumulatedCycles;
        
        // Ensure we don't have underflow in time calculations
        if (currentTime <= data.lastClaimTime) {
            return (totalValidCycles, 0);
        }
        
        uint256 timeSinceLastClaim = currentTime - data.lastClaimTime;
        
        // If there has been enough feeding time since the last claim, calculate directly
        if (data.feedingHours * 3600 >= timeSinceLastClaim) {
            validCycles = timeSinceLastClaim / SECONDS_PER_CYCLE;
            hoursToDeduct = validCycles * HOURS_PER_CYCLE;
            
            // Add to total valid cycles
            totalValidCycles += validCycles;
            
            return (totalValidCycles, hoursToDeduct);
        }
        
        // Handle starvation period case with simplified logic
        
        // Calculate hourly cycles before starvation (safe multiplication)
        uint256 hoursBeforeStarvation = data.feedingHours;
        uint256 cyclesBeforeStarvation = hoursBeforeStarvation; // Since HOURS_PER_CYCLE = 1
        
        totalValidCycles += cyclesBeforeStarvation;
        
        // Handle the case where feeding happened after starvation
        if (data.lastFeedTime > data.lastClaimTime + (data.feedingHours * 3600)) {
            uint256 timeFromLastFeed = currentTime > data.lastFeedTime ? 
                                      currentTime - data.lastFeedTime : 0;
            
            if (timeFromLastFeed > 0) {
                uint256 cyclesFromLastFeed = timeFromLastFeed / SECONDS_PER_CYCLE;
                
                // The claimable cycles are limited by the feeding hours
                uint256 currentPeriodCycles = cyclesFromLastFeed < data.feedingHours ? 
                                              cyclesFromLastFeed : data.feedingHours;
                
                totalValidCycles += currentPeriodCycles;
            }
        }
        
        // Calculate the hours to deduct, ensuring it does not exceed the current feeding hours
        uint256 hoursNeeded = (totalValidCycles - data.accumulatedCycles) * HOURS_PER_CYCLE;
        hoursToDeduct = hoursNeeded > data.feedingHours ? data.feedingHours : hoursNeeded;
        
        return (totalValidCycles, hoursToDeduct);
    }
    
    // Set PWNFT contract address
    function setPwNFT(address _pwnft) public onlyOwner {
        require(_pwnft != address(0), "Invalid PWNFT address");
        pwnft = _pwnft;
        emit ContractAddressUpdated("pwnft", _pwnft);
    }
    
    // Set NFTManager contract address
    function setNFTManager(address _nftManager) public onlyOwner {
        require(_nftManager != address(0), "Invalid NFTManager address");
        nftManager = NFTManager(_nftManager);
        emit ContractAddressUpdated("nftManager", _nftManager);
    }
    
    // Claim rewards
    function claimRewards(uint256[] calldata tokenIds) public nonReentrant {
        require(tokenIds.length > 0, "Empty token list");
        require(tokenIds.length <= 100, "Too many NFTs in single transaction");
        
        uint256 totalPwpotRewards = 0;
        uint256 totalPwbotRewards = 0;
        
        // Check for duplicate TokenIds before processing
        for (uint256 i = 0; i < tokenIds.length; i++) {
            for (uint256 j = i + 1; j < tokenIds.length; j++) {
                require(tokenIds[i] != tokenIds[j], "Duplicate NFT in list");
            }
        }
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            
            // Verify ownership
            require(IERC721(pwnft).ownerOf(tokenId) == msg.sender, "Not NFT owner");
            
            FeedingData storage data = nftFeeding[tokenId];
            
            require(data.isActive, "NFT not registered");
            
            // Calculate valid claimable cycles
            (uint256 validClaimableCycles, ) = _calculateValidClaimableCycles(data);
            
            if (validClaimableCycles > 0) {
                // Safety check: ensure quality is valid
                require(data.quality <= 4, "Invalid NFT quality");
                
                RewardConfig memory config = rewardConfigs[data.quality];
                
                // Calculate base rewards
                uint256 basePwpotReward = config.pwpotReward * validClaimableCycles;
                uint256 basePwbotReward = config.pwbotReward * validClaimableCycles;
                
                // Level 1-5: reward * level
                uint256 levelMultiplier = data.level;
                uint256 pwpotReward = basePwpotReward * levelMultiplier;
                uint256 pwbotReward = basePwbotReward * levelMultiplier;
                
                totalPwpotRewards += pwpotReward;
                totalPwbotRewards += pwbotReward;
                
                // Record old value for later verification
                uint256 oldLastClaimTime = data.lastClaimTime;
                
                // Do NOT deduct feeding hours as it causes calculation errors when users claim before feeding
                
                // Reset accumulated cycles since we're claiming them now
                data.accumulatedCycles = 0;
                
                // Update last claim time
                data.lastClaimTime = block.timestamp;
                
                // Safety check: ensure update succeeded
                require(data.lastClaimTime > oldLastClaimTime, "Claim time update failed");
            }
        }
        
        // Safety check: ensure there are rewards to claim
        require(totalPwpotRewards > 0 || totalPwbotRewards > 0, "No rewards to claim");
        
        // Transfer rewards
        pwpointManager.claimNftReward(msg.sender, totalPwpotRewards, totalPwbotRewards);
        
        emit RewardsClaimed(msg.sender, tokenIds, totalPwpotRewards, totalPwbotRewards);
    }

    // Update accumulated cycles for an NFT
    function _updateAccumulatedCycles(uint256 tokenId) private {
        FeedingData storage data = nftFeeding[tokenId];
        
        uint256 currentTime = block.timestamp;
        
        // Skip if NFT was just registered or there's no time difference
        if (data.lastClaimTime == currentTime || currentTime <= data.lastClaimTime) {
            return;
        }
        
        uint256 timeSinceLastClaim = currentTime - data.lastClaimTime;
        
        // Get the last recorded feeding time
        uint256 lastRecordedFeedingHours = data.feedingHours;
        
        // Get the actual remaining feeding time
        uint256 remainingHours = _calculateRemainingFeedingHours(data);
        
        // Calculate the consumed feeding time (hours)
        uint256 consumedHours = lastRecordedFeedingHours - remainingHours;
        
        // Check if there is time that can be accumulated as a reward cycle
        if (consumedHours > 0) {
            // Convert to cycles (1 hour = 1 cycle)
            uint256 consumedCycles = consumedHours;
            
            // The actual number of cycles that have passed
            uint256 passedCycles = timeSinceLastClaim / SECONDS_PER_CYCLE;
            
            // The actual number of cycles that can be accumulated is the smaller of the two
            uint256 cyclesToAdd = passedCycles < consumedCycles ? passedCycles : consumedCycles;
            
            // Accumulate cycles
            data.accumulatedCycles += cyclesToAdd;
            
            // Update the last claim time to avoid duplicate calculations
            data.lastClaimTime = data.lastClaimTime + (cyclesToAdd * SECONDS_PER_CYCLE);
        }
    }

    // Get total claimable reward cycles for an NFT
    function getTotalClaimableRewardCycles(uint256 tokenId) public view returns (uint256 totalCycles, uint256 pwpotReward, uint256 pwbotReward) {
        require(nftFeeding[tokenId].isActive, "NFT not registered");
        
        FeedingData storage data = nftFeeding[tokenId];
        (totalCycles, ) = _calculateValidClaimableCycles(data);
        
        if (totalCycles > 0) {
            RewardConfig memory config = rewardConfigs[data.quality];
            // Apply level multiplier to rewards
            uint256 levelMultiplier = data.level;
            pwpotReward = config.pwpotReward * totalCycles * levelMultiplier;
            pwbotReward = config.pwbotReward * totalCycles * levelMultiplier;
        }
        
        return (totalCycles, pwpotReward, pwbotReward);
    }

    // Calculate remaining effective feeding hours based on time elapsed
    function _calculateRemainingFeedingHours(FeedingData storage data) private view returns (uint256) {
        uint256 currentTime = block.timestamp;
        
        // If never fed or the last feeding time is in the future (should not happen), return 0
        if (data.lastFeedTime == 0 || data.lastFeedTime > currentTime) {
            return 0;
        }
        
        // Calculate the time elapsed since the last feeding (seconds)
        uint256 timeElapsed = currentTime - data.lastFeedTime;
        
        // Convert to hours (integer division, floor)
        uint256 hoursElapsed = timeElapsed / 3600;
        
        // If the elapsed time exceeds the previous feeding hours, return 0
        if (hoursElapsed >= data.feedingHours) {
            return 0;
        }
        
        // Otherwise, return the remaining feeding hours
        return data.feedingHours - hoursElapsed;
    }

    // Get remaining feeding hours for an NFT
    function getRemainingFeedingHours(uint256 tokenId) public view returns (uint256) {
        require(nftFeeding[tokenId].isActive, "NFT not registered");
        
        FeedingData storage data = nftFeeding[tokenId];
        return _calculateRemainingFeedingHours(data);
    }
    
    // Get NFT level and accumulated food
    function getNFTLevelInfo(uint256 tokenId) public view returns (uint256 level, uint256 accumulatedFood) {
        require(nftFeeding[tokenId].isActive, "NFT not registered");
        
        FeedingData storage data = nftFeeding[tokenId];
        return (data.level, data.accumulatedFood);
    }
    
} 