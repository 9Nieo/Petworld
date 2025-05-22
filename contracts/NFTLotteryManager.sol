// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PwNFT} from "./PwNFT.sol";
import {NFTManager} from "./NFTManager.sol";
import {NFTFeedingManager} from "./NFTFeedingManager.sol";
import {PaymentManager} from "./PaymentManager.sol";
import {PwPointManager} from "./PwPointManager.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";

contract NFTLotteryManager is ReentrancyGuard, VRFV2PlusWrapperConsumerBase {
    // Contract state variables
    PwNFT public pwnft;
    NFTManager public nftManager;
    PaymentManager public paymentManager;
    NFTFeedingManager public nftFeedingManager;
    PwPointManager public pwPointManager;
    // Record addresses that have claimed free NFTs
    mapping(address => bool) public hasClaimedFreeNFT;
    
    // User inviter mapping 
    mapping(address => address) public userInviter;
    
    // Total number of registered users
    uint256 public totalRegisteredUsers;
    
    // Random number related variables
    uint256 private nonce;

    // Owner address for access control
    address public owner;
    
    bool public specialEggPaused;
    
    // Request types
    bytes32 private constant COMMON_EGG = keccak256("COMMON_EGG");
    bytes32 private constant RARE_EGG = keccak256("RARE_EGG");
    bytes32 private constant LEGENDARY_EGG = keccak256("LEGENDARY_EGG");
    
    uint256 public constant MAX_BATCH_OPEN_COUNT = 5;
    uint256 public constant CLAIM_INVITE_REWARD_POINT = 50;
    uint256 public constant COMMON_EGG_INVITE_REWARD_POINT = 500;
    uint256 public constant RARE_EGG_INVITE_REWARD_POINT = 5000;
    uint256 public constant LEGENDARY_EGG_INVITE_REWARD_POINT = 30000;
    
    // Probability settings (calculated as a percentage, e.g., 5 means 5%)
    // Rare egg probability settings
    uint256 public initialRareEggGoodRate = 20;     // Initial good probability
    uint256 public initialRareEggExcellentRate = 70; // Initial excellent probability
    uint256 public initialRareEggRareRate = 10;      // Initial rare probability (maximum probability)
    
    // Legendary egg probability settings
    uint256 public initialLegendaryEggExcellentRate = 55; // Initial excellent probability
    uint256 public initialLegendaryEggRareRate = 40;     // Initial rare probability (maximum probability)
    uint256 public initialLegendaryEggLegendaryRate = 5; // Initial legendary probability (maximum probability)

    // Record the initial total amount of rare and legendary NFTs (for probability calculation)
    uint256 public initialRareTotal;
    uint256 public initialLegendaryTotal;
    bool public initialTotalsSet = false;
    bool public isUseNativePayment;
    // Chainlink VRF v2.5 configuration parameters
    uint32 public callbackGasLimit = 1500000;
    uint16 public requestConfirmations = 3;  
    uint32 public numWords = 1;             
    address public vrf_wrapper;
    address public linkAddress;  
    
    // store VRF request status
    struct VRFRequest {
        bool fulfilled;               // request fulfilled
        bool exists;                  // request exists
        uint256 randomWords;          // received random number
        address user;                 // request user
        bytes requestType;            // request type (rare egg or legendary egg)
    }
    
    // request mapping
    mapping(uint256 => VRFRequest) public vrfRequests;
    // user to request ID mapping
    mapping(address => uint256[]) public userRequests;
    // user pending rare and legendary eggs
    mapping(address => uint256) public pendingRareEggs;
    mapping(address => uint256) public pendingLegendaryEggs;
    
    // Event definitions
    event FreeNFTClaimed(address indexed user, uint256 tokenId, uint256 nftId);
    event NFTLotteryResult(address indexed user, uint256 tokenId, uint8 quality, uint256 nftId, string lotteryType);
    event InitialTotalsSet(uint256 rareTotal, uint256 legendaryTotal);
    event ContractRenounced(address indexed previousOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event SpecialEggPaused(bool paused);
    
    // VRF related events
    event VRFRequested(uint256 requestId, address indexed user, bytes requestType);
    event VRFRequestFulfilled(uint256 requestId, uint256 randomWords);
    event EggQueued(address indexed user, bytes requestType, uint256 count);
    event VRFRequestPrice(uint256 requestId, uint256 price);
    
    // Use the quality enumeration defined in NFTManager
    enum Quality { COMMON, GOOD, EXCELLENT, RARE, LEGENDARY }
    
    // Basic access control modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier whenSpecialEggNotPaused() {
        require(!specialEggPaused, "Special egg functions are paused");
        _;
    }
    
    constructor(address _vrfWrapper, address _linkAddress) VRFV2PlusWrapperConsumerBase(_vrfWrapper) {
        require(_vrfWrapper != address(0), "VRF wrapper address cannot be zero");
        require(_linkAddress != address(0), "LINK address cannot be zero");
        vrf_wrapper = _vrfWrapper;
        linkAddress = _linkAddress;
        nonce = 0;
        totalRegisteredUsers = 0;
        initialRareTotal = 8000;
        initialLegendaryTotal = 1000;
        initialTotalsSet = true;
        owner = msg.sender;
        specialEggPaused = false;
        isUseNativePayment = true;
    }


    // Transfer ownership
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // Renounce ownership
    function renounceOwnership() public onlyOwner {
        emit ContractRenounced(owner);
        owner = address(0);
    }
    
    // pause or resume rare and legendary egg functions
    function setSpecialEggPaused(bool _paused) public onlyOwner {
        specialEggPaused = _paused;
        emit SpecialEggPaused(_paused);
    }

    function setIsUseNativePayment(bool _isUseNativePayment) public onlyOwner {
        isUseNativePayment = _isUseNativePayment;
    }

    // base random number - only used for common egg lottery
    function _getRandomNumber(uint256 _max) private returns (uint256) {
        nonce++;
        bytes32 entropy = keccak256(
            abi.encodePacked(
                blockhash(block.number - 1),       // previous block hash
                block.timestamp,                   // current block timestamp
                block.prevrandao,                  // block randomness
                block.coinbase,                    // miner address
                msg.sender,                        // user address
                nonce,                             // increasing nonce value
                gasleft()                          // remaining gas (unpredictable)
            )
        );
        
        // multiple hash to increase calculation complexity
        for (uint i = 0; i < 2; i++) {
            entropy = keccak256(abi.encodePacked(entropy, i, block.number));
        }
        
        return uint256(entropy) % _max;
    }
    
    // Update NFTFeedingManager address
    function setNFTFeedingManager(address _nftFeedingManager) public onlyOwner {
        require(_nftFeedingManager != address(0), "New address cannot be zero");
        nftFeedingManager = NFTFeedingManager(_nftFeedingManager);
    }
    
    // Update PwPointManager address
    function setPwPointManager(address _pwPointManager) public onlyOwner {
        require(_pwPointManager != address(0), "New address cannot be zero");
        pwPointManager = PwPointManager(payable(_pwPointManager));
    }
    
    // Update contract address
    function setPwNFT(address _pwnft) public onlyOwner {
        require(_pwnft != address(0), "New address cannot be zero");
        pwnft = PwNFT(_pwnft);
    }
    
    // Update NFTManager address
    function setNFTManager(address _nftManager) public onlyOwner {
        require(_nftManager != address(0), "New address cannot be zero");
        nftManager = NFTManager(_nftManager);
        
        // Request NFTManager to authorize this contract as a status manager
        try NFTManager(_nftManager).setStatusManagerAuthorization(address(this), true) {
            // Authorization successful, no additional processing required
        } catch {
            // Authorization failed, but does not prevent setting the address
        }
    }
    
    function setPaymentManager(address payable _paymentManager) public onlyOwner {
        require(_paymentManager != address(0), "New address cannot be zero");
        paymentManager = PaymentManager(_paymentManager);
    }
    
    // Set the initial total amount of rare and legendary NFTs
    function setInitialTotals() public onlyOwner {
        require(!initialTotalsSet, "Initial totals already set");
        
        initialRareTotal = nftManager.totalRareRemaining();
        initialLegendaryTotal = nftManager.totalLegendaryRemaining();
        initialTotalsSet = true;
        
        emit InitialTotalsSet(initialRareTotal, initialLegendaryTotal);
    }
    
    // Calculate dynamic probabilities for rare eggs
    function calculateRareEggProbabilities() private view returns (
        uint256 goodRate,
        uint256 excellentRate,
        uint256 rareRate
    ) {
        // If initial totals have not been set, use default probabilities
        if (!initialTotalsSet || initialRareTotal == 0) {
            return (initialRareEggGoodRate, initialRareEggExcellentRate, initialRareEggRareRate);
        }
        
        uint256 currentRareRemaining = nftManager.totalRareRemaining();
        
        // Safely calculate rareRate with zero check
        if (initialRareTotal > 0) {
            rareRate = (initialRareEggRareRate * currentRareRemaining) / initialRareTotal;
            
            // Ensure it does not exceed the maximum probability
            if (rareRate > initialRareEggRareRate) {
                rareRate = initialRareEggRareRate;
            }
        } else {
            // If initialRareTotal is zero, use the initial/default rate
            rareRate = initialRareEggRareRate;
        }
        
        // Good rate remains unchanged
        goodRate = initialRareEggGoodRate;
        
        // Excellent rate increases by the reduced rare rate
        excellentRate = initialRareEggExcellentRate + (initialRareEggRareRate - rareRate);
        
        return (goodRate, excellentRate, rareRate);
    }
    
    // Calculate dynamic probabilities for legendary eggs
    function calculateLegendaryEggProbabilities() private view returns (
        uint256 excellentRate,
        uint256 rareRate,
        uint256 legendaryRate
    ) {
        // If initial totals have not been set, use default probabilities
        if (!initialTotalsSet || initialRareTotal == 0 || initialLegendaryTotal == 0) {
            return (initialLegendaryEggExcellentRate, initialLegendaryEggRareRate, initialLegendaryEggLegendaryRate);
        }
        
        uint256 currentRareRemaining = nftManager.totalRareRemaining();
        uint256 currentLegendaryRemaining = nftManager.totalLegendaryRemaining();
        
        // Safely calculate rareRate with zero check
        if (initialRareTotal > 0) {
            rareRate = (initialLegendaryEggRareRate * currentRareRemaining) / initialRareTotal;
            
            // Ensure it does not exceed the maximum probability
            if (rareRate > initialLegendaryEggRareRate) {
                rareRate = initialLegendaryEggRareRate;
            }
        } else {
            // If initialRareTotal is zero, use the initial/default rate
            rareRate = initialLegendaryEggRareRate;
        }
        
        // Safely calculate legendaryRate with zero check
        if (initialLegendaryTotal > 0) {
            legendaryRate = (initialLegendaryEggLegendaryRate * currentLegendaryRemaining) / initialLegendaryTotal;
            
            // Ensure it does not exceed the maximum probability
            if (legendaryRate > initialLegendaryEggLegendaryRate) {
                legendaryRate = initialLegendaryEggLegendaryRate;
            }
        } else {
            // If initialLegendaryTotal is zero, use the initial/default rate
            legendaryRate = initialLegendaryEggLegendaryRate;
        }
        
        // Excellent rate increases by the reduced rare rate and legendary rate
        excellentRate = initialLegendaryEggExcellentRate + 
                       (initialLegendaryEggRareRate - rareRate) + 
                       (initialLegendaryEggLegendaryRate - legendaryRate);
        
        return (excellentRate, rareRate, legendaryRate);
    }
    
    // Get available NFT ID from NFTManager based on quality
    function _getAvailableNFTId(Quality _quality) private returns (uint256) {
        uint8 qualityValue = uint8(_quality);
        uint256 nftCount = nftManager.nftCountByQuality(NFTManager.Quality(qualityValue));
        
        // First count the available NFTs
        uint256 totalAvailable = 0;
        uint256 totalRemaining = 0;
        
        for (uint256 i = 0; i < nftCount; i++) {
            NFTManager.NFTInfo memory nftInfo = _getNFTInfo(_quality, i);
            
            if (nftInfo.active && (nftInfo.maxSupply == 0 || nftInfo.minted < nftInfo.maxSupply)) {
                totalAvailable++;
                uint256 remaining = nftInfo.maxSupply == 0 ? 1000000 : nftInfo.maxSupply - nftInfo.minted;
                totalRemaining += remaining;
            }
        }
        
        if (totalAvailable == 0) {
            revert(string(abi.encodePacked("No available NFTs found for quality ", uint2str(qualityValue), ", please check NFT activation status and supply")));
        }
        
        // Create an appropriately sized array
        uint256[] memory availableIds = new uint256[](totalAvailable);
        uint256[] memory remainingSupplies = new uint256[](totalAvailable);
        uint256 currentIndex = 0;
        
        // Traverse again to fill the array
        for (uint256 i = 0; i < nftCount; i++) {
            NFTManager.NFTInfo memory nftInfo = _getNFTInfo(_quality, i);
            
            if (nftInfo.active && (nftInfo.maxSupply == 0 || nftInfo.minted < nftInfo.maxSupply)) {
                availableIds[currentIndex] = i;
                uint256 remaining = nftInfo.maxSupply == 0 ? 1000000 : nftInfo.maxSupply - nftInfo.minted;
                remainingSupplies[currentIndex] = remaining;
                currentIndex++;
            }
        }
        
        // Generate a random number and select NFT based on remaining supply proportionally
        uint256 rand = _getRandomNumber(totalRemaining);
        uint256 cumulativeSupply = 0;
        
        // Use weighted random selection for NFT ID
        for (uint256 i = 0; i < totalAvailable; i++) {
            cumulativeSupply += remainingSupplies[i];
            if (rand < cumulativeSupply) {
                return availableIds[i];
            }
        }
        
        // If the loop above does not return a result due to rounding errors, return the last available ID
        return availableIds[totalAvailable - 1];
    }
    
    // Helper function: Get NFT information from NFTManager
    function _getNFTInfo(Quality _quality, uint256 _id) private view returns (NFTManager.NFTInfo memory) {
        (
            string memory uri,
            uint256 maxSupply,
            uint256 minted,
            bool active,
            uint256 name
        ) = nftManager.nfts(NFTManager.Quality(uint8(_quality)), _id);
        
        NFTManager.NFTInfo memory info;
        info.uri = uri;
        info.maxSupply = maxSupply;
        info.minted = minted;
        info.active = active;
        info.name = name;
        
        return info;
    }
    
    // Helper function: Try to get available NFT ID starting from a specified quality, if it fails, downgrade the quality
    function _getQualityNFTId(Quality startQuality) private returns (Quality finalQuality, uint256 nftId) {
        // Start from the initial quality and try to get NFT ID in descending order
        Quality[] memory qualityOrder = new Quality[](5);
        uint8 qualityCount = 0;
        
        // Determine the attempt order based on the starting quality
        qualityOrder[qualityCount++] = startQuality;
        
        if (startQuality == Quality.LEGENDARY) {
            qualityOrder[qualityCount++] = Quality.RARE;
            qualityOrder[qualityCount++] = Quality.EXCELLENT;
            qualityOrder[qualityCount++] = Quality.GOOD;
            qualityOrder[qualityCount++] = Quality.COMMON;
        } else if (startQuality == Quality.RARE) {
            qualityOrder[qualityCount++] = Quality.EXCELLENT;
            qualityOrder[qualityCount++] = Quality.GOOD;
            qualityOrder[qualityCount++] = Quality.COMMON;
        } else if (startQuality == Quality.EXCELLENT) {
            qualityOrder[qualityCount++] = Quality.GOOD;
            qualityOrder[qualityCount++] = Quality.COMMON;
        } else if (startQuality == Quality.GOOD) {
            qualityOrder[qualityCount++] = Quality.COMMON;
        }
        
        // Try in order
        for (uint8 i = 0; i < qualityCount; i++) {
            try this.tryGetAvailableNFTId(qualityOrder[i]) returns (uint256 id) {
                return (qualityOrder[i], id);
            } catch {
                // Continue to try the next quality
                continue;
            }
        }
        
        // If all qualities fail, return the lowest quality NFT ID
        // This will directly call _getAvailableNFTId, and if it fails, it will throw an error
        return (Quality.COMMON, _getAvailableNFTId(Quality.COMMON));
    }
    
    // Helper function: Convert uint to string
    function uint2str(uint256 _i) private pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        return string(bstr);
    }
    
    // Helper function to disable NFT after it has been drawn
    function _disableNFTIfLastOne(Quality _quality, uint256 _nftId) private {
        // Get current NFT information
        (string memory uri, uint256 maxSupply, uint256 minted, bool active, uint256 name) = nftManager.nfts(NFTManager.Quality(uint8(_quality)), _nftId);
        
        // Variable usage to avoid compilation warnings
        uri;
        name;
        
        // If this is the last NFT, set it to unavailable
        if (active && maxSupply > 0 && minted >= maxSupply) {
            try nftManager.setNFTStatus(NFTManager.Quality(uint8(_quality)), _nftId, false) {
                // NFT disable successful
            } catch {
            }
        }
    }
    
    /**
     * @dev Internal function: Register NFT to NFTFeedingManager
     */
    function _registerNFTToFeedingManager(uint256 tokenId) private {
        // Register NFT to feeding system - NFTFeedingManager will get quality from NFTManager
        if (address(nftFeedingManager) != address(0)) {
            nftFeedingManager.registerNFT(tokenId);
        }
    }
    
    // Helper function to batch process invite rewards
    function _sendBatchInviteReward(address user, address inviter, uint256 pointAmount, uint256 count) private {
        if (inviter != address(0)) {
            // Call inviteReward once with the total amount instead of multiple times
            pwPointManager.inviteReward(user, inviter, pointAmount * count);
        }
    }
    
    // Modify claimFreeNFT function
    function claimFreeNFT(address inviter) public nonReentrant {
        require(!hasClaimedFreeNFT[msg.sender], "Already claimed free NFT");
        // Mark address as claimed
        hasClaimedFreeNFT[msg.sender] = true;

        // Set inviter directly in this contract, not in NFTFeedingManager
        userInviter[msg.sender] = inviter;
        
        if(inviter != address(0)){
            pwPointManager.inviteReward(msg.sender, inviter, CLAIM_INVITE_REWARD_POINT);
        }

        // Increase registered user count
        totalRegisteredUsers++;
        
        // Get a common quality NFT ID
        uint256 nftId = _getAvailableNFTId(Quality.COMMON);
        
        // Mint NFT and send to user
        uint256 tokenId = pwnft.safeMint(msg.sender, uint256(Quality.COMMON), nftId);
        
        // Register to feeding system
        _registerNFTToFeedingManager(tokenId);
        
        // Check if NFT needs to be disabled
        _disableNFTIfLastOne(Quality.COMMON, nftId);
        
        emit FreeNFTClaimed(msg.sender, tokenId, nftId);
    }
    
    // Process Common Egg result
    function processCommonEgg(address user, uint256 randomNumber) private {
        // Determine quality based on random number
        Quality quality;
        if (randomNumber < 5) {
            // 5% chance to get common quality
            quality = Quality.COMMON;
        } else if (randomNumber < 90) {
            // 85% chance to get good quality
            quality = Quality.GOOD;
        } else {
            // 10% chance to get excellent quality
            quality = Quality.EXCELLENT;
        }
        
        // Get a random NFT ID of the corresponding quality
        uint256 nftId = _getAvailableNFTId(quality);
        
        // Mint NFT and send to user
        uint256 tokenId = pwnft.safeMint(user, uint256(quality), nftId);
        
        // Register to feeding manager
        _registerNFTToFeedingManager(tokenId);
        
        // Check if NFT needs to be disabled
        _disableNFTIfLastOne(quality, nftId);
        
        // Note: We no longer call inviteReward here
        // Reward will be processed in batch after all eggs are opened
        
        emit NFTLotteryResult(user, tokenId, uint8(quality), nftId, "CommonEgg");
    }
    
    // Process Rare Egg result
    function processRareEgg(address user, uint256 randomNumber) private {
        // Get current dynamic probabilities
        (uint256 goodRate, uint256 excellentRate, uint256 rareRate) = calculateRareEggProbabilities();
        
        // First check if there are available NFTs of each quality
        (, uint256 rareAvailable) = nftManager.getAvailableNFTCount(NFTManager.Quality.RARE);
        (, uint256 excellentAvailable) = nftManager.getAvailableNFTCount(NFTManager.Quality.EXCELLENT);
        (, uint256 goodAvailable) = nftManager.getAvailableNFTCount(NFTManager.Quality.GOOD);
        
        // If a quality has no available NFTs, redistribute its probability
        if (rareAvailable == 0) {
            // Allocate rare probability to excellent
            excellentRate += rareRate;
            rareRate = 0;
        }
        
        if (excellentAvailable == 0) {
            // Allocate excellent probability to good
            goodRate += excellentRate;
            excellentRate = 0;
        }
        
        // Determine initial quality
        Quality quality;
        if (randomNumber < goodRate && goodAvailable > 0) {
            quality = Quality.GOOD;
        } else if (randomNumber < goodRate + excellentRate && excellentAvailable > 0) {
            quality = Quality.EXCELLENT;
        } else if (rareAvailable > 0) {
            quality = Quality.RARE;
        } else if (excellentAvailable > 0) {
            quality = Quality.EXCELLENT;
        } else if (goodAvailable > 0) {
            quality = Quality.GOOD;
        } else {
            // Try COMMON quality as a last resort
            (, uint256 commonAvailable) = nftManager.getAvailableNFTCount(NFTManager.Quality.COMMON);
            if (commonAvailable > 0) {
                quality = Quality.COMMON;
            } else {
                revert("No available NFTs of any quality");
            }
        }
        
        // Get NFT ID, if the current quality has no available NFTs, it will try to downgrade
        (Quality finalQuality, uint256 nftId) = _getQualityNFTId(quality);
        
        // Mint NFT and send to user
        uint256 tokenId = pwnft.safeMint(user, uint256(finalQuality), nftId);
        
        // Register to feeding manager
        _registerNFTToFeedingManager(tokenId);
        
        // Check if NFT needs to be disabled
        _disableNFTIfLastOne(finalQuality, nftId);
        
        // Note: We no longer call inviteReward here
        // Reward will be processed in batch after all eggs are opened
        
        emit NFTLotteryResult(user, tokenId, uint8(finalQuality), nftId, "RareEgg");
    }
    
    // Process Legendary Egg result
    function processLegendaryEgg(address user, uint256 randomNumber) private {
        // Get current dynamic probabilities
        (uint256 excellentRate, uint256 rareRate, uint256 legendaryRate) = calculateLegendaryEggProbabilities();
        
        // First check if there are available NFTs of each quality
        (, uint256 legendaryAvailable) = nftManager.getAvailableNFTCount(NFTManager.Quality.LEGENDARY);
        (, uint256 rareAvailable) = nftManager.getAvailableNFTCount(NFTManager.Quality.RARE);
        (, uint256 excellentAvailable) = nftManager.getAvailableNFTCount(NFTManager.Quality.EXCELLENT);
        (, uint256 goodAvailable) = nftManager.getAvailableNFTCount(NFTManager.Quality.GOOD);
        
        // If a quality has no available NFTs, redistribute its probability
        if (legendaryAvailable == 0) {
            // Allocate legendary probability to rare
            rareRate += legendaryRate;
            legendaryRate = 0;
        }
        
        if (rareAvailable == 0) {
            // Allocate rare probability to excellent
            excellentRate += rareRate;
            rareRate = 0;
        }
        
        // Determine initial quality
        Quality quality;
        if (randomNumber < excellentRate && excellentAvailable > 0) {
            quality = Quality.EXCELLENT;
        } else if (randomNumber < excellentRate + rareRate && rareAvailable > 0) {
            quality = Quality.RARE;
        } else if (legendaryAvailable > 0) {
            quality = Quality.LEGENDARY;
        } else if (rareAvailable > 0) {
            quality = Quality.RARE;
        } else if (excellentAvailable > 0) {
            quality = Quality.EXCELLENT;
        } else if (goodAvailable > 0) {
            quality = Quality.GOOD;
        } else {
            // Try COMMON quality as a last resort
            (, uint256 commonAvailable) = nftManager.getAvailableNFTCount(NFTManager.Quality.COMMON);
            if (commonAvailable > 0) {
                quality = Quality.COMMON;
            } else {
                revert("No available NFTs of any quality");
            }
        }
        
        // Get NFT ID, if the current quality has no available NFTs, it will try to downgrade
        (Quality finalQuality, uint256 nftId) = _getQualityNFTId(quality);
        
        // Mint NFT and send to user
        uint256 tokenId = pwnft.safeMint(user, uint256(finalQuality), nftId);
        
        // Register to feeding manager
        _registerNFTToFeedingManager(tokenId);
        
        // Check if NFT needs to be disabled
        _disableNFTIfLastOne(finalQuality, nftId);
        
        // Note: We no longer call inviteReward here
        // Reward will be processed in batch after all eggs are opened
        
        emit NFTLotteryResult(user, tokenId, uint8(finalQuality), nftId, "LegendaryEgg");
    }
    
    // openCommonEgg function
    function openCommonEgg(address _token) public nonReentrant whenSpecialEggNotPaused {
        // Call PaymentManager to handle payment, passing msg.sender as the original payer
        try paymentManager.payForCommonLottery(_token, 1, msg.sender) {
            // use local random number generator
            uint256 randomNumber = _getRandomNumber(100);
            
            // directly process the result
            processCommonEgg(msg.sender, randomNumber);
            
            // Send invite reward after processing the egg
            address inviter = userInviter[msg.sender];
            if(inviter != address(0)){
                pwPointManager.inviteReward(msg.sender, inviter, COMMON_EGG_INVITE_REWARD_POINT);
            }
        } catch Error(string memory reason) {
            // Directly pass the error message from PaymentManager
            revert(string(abi.encodePacked("Payment failed: ", reason)));
        } catch {
            revert("Payment failed with unknown error");
        }
    }
    
    // openRareEgg function
    function openRareEgg(address _token) public nonReentrant whenSpecialEggNotPaused {
        // ensure contract has enough funds
        if (isUseNativePayment) {
            require(address(this).balance > 0, "Contract does not have enough native tokens for VRF");
        } else {
            LinkTokenInterface link = LinkTokenInterface(linkAddress);
            require(link.balanceOf(address(this)) > 0, "Contract does not have enough LINK tokens for VRF");
        }
        
        // Call PaymentManager to handle payment, passing msg.sender as the original payer
        try paymentManager.payForRareLottery(_token, 1, msg.sender) {
            // request VRF random number and record
            requestRandomWords(msg.sender, abi.encodePacked(RARE_EGG));
            
            // emit egg queue event
            emit EggQueued(msg.sender, abi.encodePacked(RARE_EGG), 1);
        } catch Error(string memory reason) {
            // Add "Payment failed: " prefix
            revert(string(abi.encodePacked("Payment failed: ", reason)));
        } catch {
            revert("Payment failed with unknown error");
        }
    }
    
    // openLegendaryEgg function
    function openLegendaryEgg(address _token) public nonReentrant whenSpecialEggNotPaused {
        // ensure contract has enough funds
        if (isUseNativePayment) {
            require(address(this).balance > 0, "Contract does not have enough native tokens for VRF");
        } else {
            LinkTokenInterface link = LinkTokenInterface(linkAddress);
            require(link.balanceOf(address(this)) > 0, "Contract does not have enough LINK tokens for VRF");
        }
        
        // Call PaymentManager to handle payment, passing msg.sender as the original payer
        try paymentManager.payForLegendaryLottery(_token, 1, msg.sender) {
            // request VRF random number and record
            requestRandomWords(msg.sender, abi.encodePacked(LEGENDARY_EGG));
            
            // emit egg queue event
            emit EggQueued(msg.sender, abi.encodePacked(LEGENDARY_EGG), 1);
        } catch Error(string memory reason) {
            // Add "Payment failed: " prefix
            revert(string(abi.encodePacked("Payment failed: ", reason)));
        } catch {
            revert("Payment failed with unknown error");
        }
    }
    
    // Batch open common eggs (2-5)
    function batchOpenCommonEgg(address _token, uint256 _count) public nonReentrant whenSpecialEggNotPaused {
        // Validate count is within allowed range
        require(_count >= 2 && _count <= MAX_BATCH_OPEN_COUNT, "Count must be between 2 and 5");
        
        // Call PaymentManager to handle payment for multiple eggs
        try paymentManager.payForCommonLottery(_token, _count, msg.sender) {
            // Open eggs one by one
            for (uint256 i = 0; i < _count; i++) {
                // use local random number generator
                uint256 randomNumber = _getRandomNumber(100);
                
                // directly process the result
                processCommonEgg(msg.sender, randomNumber);
            }
            
            // Send batch invite reward after opening all eggs
            address inviter = userInviter[msg.sender];
            _sendBatchInviteReward(msg.sender, inviter, COMMON_EGG_INVITE_REWARD_POINT, _count);
            
        } catch Error(string memory reason) {
            // Directly pass the error message from PaymentManager
            revert(string(abi.encodePacked("Payment failed: ", reason)));
        } catch {
            revert("Payment failed with unknown error");
        }
    }
    
    // Batch open rare eggs (2-5)
    function batchOpenRareEgg(address _token, uint256 _count) public nonReentrant whenSpecialEggNotPaused {
        // Validate count is within allowed range
        require(_count >= 2 && _count <= MAX_BATCH_OPEN_COUNT, "Count must be between 2 and 5");
        
        // ensure contract has enough funds
        if (isUseNativePayment) {
            require(address(this).balance > 0, "Contract does not have enough native tokens for VRF");
        } else {
            LinkTokenInterface link = LinkTokenInterface(linkAddress);
            require(link.balanceOf(address(this)) > 0, "Contract does not have enough LINK tokens for VRF");
        }
        
        // Call PaymentManager to handle payment for multiple eggs
        try paymentManager.payForRareLottery(_token, _count, msg.sender) {
            // request random number for each egg
            for (uint256 i = 0; i < _count; i++) {
                requestRandomWords(msg.sender, abi.encodePacked(RARE_EGG));
            }
            
            // emit egg queue event
            emit EggQueued(msg.sender, abi.encodePacked(RARE_EGG), _count);
        } catch Error(string memory reason) {
            // Add "Payment failed: " prefix
            revert(string(abi.encodePacked("Payment failed: ", reason)));
        } catch {
            revert("Payment failed with unknown error");
        }
    }
    
    // Batch open legendary eggs (2-5)
    function batchOpenLegendaryEgg(address _token, uint256 _count) public nonReentrant whenSpecialEggNotPaused {
        // Validate count is within allowed range
        require(_count >= 2 && _count <= MAX_BATCH_OPEN_COUNT, "Count must be between 2 and 5");
        
        // ensure contract has enough funds
        if (isUseNativePayment) {
            require(address(this).balance > 0, "Contract does not have enough native tokens for VRF");
        } else {
            LinkTokenInterface link = LinkTokenInterface(linkAddress);
            require(link.balanceOf(address(this)) > 0, "Contract does not have enough LINK tokens for VRF");
        }
        
        // Call PaymentManager to handle payment for multiple eggs
        try paymentManager.payForLegendaryLottery(_token, _count, msg.sender) {
            // request random number for each egg
            for (uint256 i = 0; i < _count; i++) {
                requestRandomWords(msg.sender, abi.encodePacked(LEGENDARY_EGG));
            }
            
            // emit egg queue event
            emit EggQueued(msg.sender, abi.encodePacked(LEGENDARY_EGG), _count);
        } catch Error(string memory reason) {
            // Add "Payment failed: " prefix
            revert(string(abi.encodePacked("Payment failed: ", reason)));
        } catch {
            revert("Payment failed with unknown error");
        }
    }

    // Add tryGetAvailableNFTId helper function to attempt to get available NFT ID and allow external calls to catch exceptions
    function tryGetAvailableNFTId(Quality _quality) public returns (uint256) {
        // Only allow the contract to call
        require(msg.sender == address(this), "Only contract can call");
        
        return _getAvailableNFTId(_quality);
    }

    // VRF request random number
    function requestRandomWords(address user, bytes memory requestType) private returns (uint256) {
        // configure VRF parameters
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: isUseNativePayment})
        );
        
        uint256 requestId;
        uint256 reqPrice;
        
        // select request function based on payment method
        if (isUseNativePayment) {
            // use native token payment
            (requestId, reqPrice) = requestRandomnessPayInNative(
                callbackGasLimit,
                requestConfirmations,
                numWords,
                extraArgs
            );
        } else {
            // use LINK token payment
            (requestId, reqPrice) = requestRandomness(
                callbackGasLimit,
                requestConfirmations,
                numWords,
                extraArgs
            );
        }
        
        // save request information
        vrfRequests[requestId] = VRFRequest({
            fulfilled: false,
            exists: true,
            randomWords: 0,
            user: user,
            requestType: requestType
        });
        
        // add to user requests list
        userRequests[user].push(requestId);
        
        // emit event
        emit VRFRequested(requestId, user, requestType);
        emit VRFRequestPrice(requestId, reqPrice);
        
        return requestId;
    }
    
    // VRF callback function, receive random number
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        require(vrfRequests[_requestId].exists, "Request does not exist");
        require(!vrfRequests[_requestId].fulfilled, "Request already processed");
        
        // update request status
        vrfRequests[_requestId].fulfilled = true;
        vrfRequests[_requestId].randomWords = _randomWords[0];
        
        address user = vrfRequests[_requestId].user;
        bytes memory requestType = vrfRequests[_requestId].requestType;
        
        // increase user pending eggs
        if (keccak256(requestType) == keccak256(abi.encodePacked(RARE_EGG))) {
            pendingRareEggs[user]++;
        } else if (keccak256(requestType) == keccak256(abi.encodePacked(LEGENDARY_EGG))) {
            pendingLegendaryEggs[user]++;
        }
        
        emit VRFRequestFulfilled(_requestId, _randomWords[0]);
    }
    
    // update VRF wrapper address
    function setVRFWrapper(address _vrfWrapper) public onlyOwner {
        require(_vrfWrapper != address(0), "New address cannot be zero");
        vrf_wrapper = _vrfWrapper;
    }
    
    // update VRF parameters
    function setVRFConfig(uint32 _callbackGasLimit, uint16 _requestConfirmations, uint32 _numWords) public onlyOwner {
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
    }
    
    // get user pending requests
    function getUserPendingRequests(address user) public view returns (uint256[] memory) {
        return userRequests[user];
    }
    
    // get request status
    function getRequestStatus(uint256 requestId) public view returns (bool fulfilled, bool exists, uint256 randomWords) {
        require(vrfRequests[requestId].exists, "Request does not exist");
        VRFRequest memory request = vrfRequests[requestId];
        return (request.fulfilled, request.exists, request.randomWords);
    }
    
    // claim eggs
    function claimEggs() public nonReentrant {
        // Get pending counts
        uint256 pendingRare = pendingRareEggs[msg.sender];
        uint256 pendingLegendary = pendingLegendaryEggs[msg.sender];
        
        // Check if user has any pending eggs
        require(pendingRare > 0 || pendingLegendary > 0, "No pending eggs");
        
        // Get all user requests
        uint256[] memory requests = userRequests[msg.sender];
        uint256 totalRareClaimed = 0;
        uint256 totalLegendaryClaimed = 0;
        
        // Process all rare eggs first
        for (uint256 i = 0; i < pendingRare && i < MAX_BATCH_OPEN_COUNT; i++) { // Limit to 5 at a time to avoid gas issues
            bool claimed = _processSingleEgg(requests, RARE_EGG);
            if (claimed) {
                pendingRareEggs[msg.sender]--;
                totalRareClaimed++;
            } else {
                break; // No more VRF requests found
            }
        }
        
        // Process legendary eggs next
        for (uint256 i = 0; i < pendingLegendary && i < MAX_BATCH_OPEN_COUNT; i++) { // Limit to 5 at a time to avoid gas issues
            bool claimed = _processSingleEgg(requests, LEGENDARY_EGG);
            if (claimed) {
                pendingLegendaryEggs[msg.sender]--;
                totalLegendaryClaimed++;
            } else {
                break; // No more VRF requests found
            }
        }
        
        // Ensure we claimed at least one egg
        require(totalRareClaimed > 0 || totalLegendaryClaimed > 0, "Failed to claim any eggs");
        
        // Send batch invite rewards after processing all eggs
        address inviter = userInviter[msg.sender];
        
        // Only send rewards if eggs were claimed and there's an inviter
        if (inviter != address(0)) {
            if (totalRareClaimed > 0) {
                _sendBatchInviteReward(msg.sender, inviter, RARE_EGG_INVITE_REWARD_POINT, totalRareClaimed);
            }
            
            if (totalLegendaryClaimed > 0) {
                _sendBatchInviteReward(msg.sender, inviter, LEGENDARY_EGG_INVITE_REWARD_POINT, totalLegendaryClaimed);
            }
        }
    }
    
    // Helper function to process a single egg
    function _processSingleEgg(uint256[] memory requests, bytes32 eggType) private returns (bool) {
        uint256 requestId = 0;
        bool found = false;
        
        // Find a completed VRF request for the given egg type
        for (uint256 i = 0; i < requests.length; i++) {
            uint256 reqId = requests[i];
            VRFRequest memory request = vrfRequests[reqId];
            
            if (request.fulfilled && 
                request.exists && 
                keccak256(request.requestType) == keccak256(abi.encodePacked(eggType))) {
                requestId = reqId;
                found = true;
                break;
            }
        }
        
        if (!found) {
            return false;
        }
        
        // get VRF generated random number
        uint256 randomNumber = vrfRequests[requestId].randomWords % 100;
        
        // mark request as not exist to avoid duplicate processing
        vrfRequests[requestId].exists = false;
        
        // process egg based on type, but don't send rewards yet
        if (eggType == RARE_EGG) {
            processRareEgg(msg.sender, randomNumber);
        } else if (eggType == LEGENDARY_EGG) {
            processLegendaryEgg(msg.sender, randomNumber);
        }
        
        return true;
    }
    
    // get user pending rare and legendary eggs
    function getPendingEggs(address user) public view returns (uint256 rareEggs, uint256 legendaryEggs) {
        return (pendingRareEggs[user], pendingLegendaryEggs[user]);
    }

    event Received(address, uint256);

    // receive BNB
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    /**
     * Allow withdraw of Link tokens from the contract
     */
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(linkAddress);
        require(
            link.transfer(msg.sender, link.balanceOf(address(this))),
            "Unable to transfer"
        );
    }

    /// @notice withdrawNative withdraws the amount specified in amount to the owner
    /// @param amount the amount to withdraw, in wei
    function withdrawNative(uint256 amount) external onlyOwner {
        (bool success, ) = payable(owner).call{value: amount}("");
        // solhint-disable-next-line gas-custom-errors
        require(success, "withdrawNative failed");
    }
    
    // admin deposit BNB for VRF payment
    function depositBNBForVRF() external payable onlyOwner {
        // only receive funds, no additional logic
        emit Received(msg.sender, msg.value);
    }

    // get contract LINK balance
    function getLinkBalance() public view returns (uint256) {
        LinkTokenInterface link = LinkTokenInterface(linkAddress);
        return link.balanceOf(address(this));
    }

    // set LINK address
    function setLinkAddress(address _linkAddress) public onlyOwner {
        require(_linkAddress != address(0), "LINK address cannot be zero");
        linkAddress = _linkAddress;
    }

    // check if user has claimable eggs
    function hasClaimableEggs(address user) public view returns (bool) {
        return pendingRareEggs[user] > 0 || pendingLegendaryEggs[user] > 0;
    }

}
    