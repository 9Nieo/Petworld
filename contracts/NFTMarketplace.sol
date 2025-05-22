// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {NFTManager} from "./NFTManager.sol";

// Forward declaration of the indexer interface
interface IRareNFTTransactionIndexer {
    function indexTransaction(
        uint256 tokenId,
        address seller,
        address buyer,
        uint8 quality,
        uint256 price,
        uint256 timestamp,
        uint256 level,
        uint256 accumulatedFood
    ) external;
}

// Forward declaration of the NFTFeedingManager interface for getting NFT level info
interface INFTFeedingManager {
    function getNFTLevelInfo(uint256 tokenId) external view returns (uint256 level, uint256 accumulatedFood);
}

/**
 * @title NFTMarketplace
 * @dev Marketplace for PWNFT series NFTs, allowing users to list and purchase NFTs, with a 1% transaction fee
 */
contract NFTMarketplace is Ownable, ReentrancyGuard, IERC721Receiver {
    // Constant definitions
    uint256 public constant FEE_PERCENTAGE = 1; // 1% fee
    uint256 public constant FEE_DENOMINATOR = 100; // Percentage denominator
    uint256 public constant ACTION_COOLDOWN = 1 hours; // Action cooldown time is 1 hour
    uint256 public constant MAX_PRICE = 1e40; // 10^40, sufficiently large but prevents overflow

    // State variables
    address public pwnftAddress; // Reference to PWNFT contract
    address public feeReceiver; // Fee receiver address
    NFTManager public nftManager; // Reference to NFT management contract
    address public transactionIndexer; // Transaction indexer address
    address public nftFeedingManager; // NFT feeding manager address
    bool public indexerEnabled = false; // Whether the transaction indexer is enabled
    bool public initialized = false; // Whether the marketplace is initialized for operations

    // Quality enumeration
    enum Quality { COMMON, GOOD, EXCELLENT, RARE, LEGENDARY }

    // Token-related mappings
    mapping(address => bool) public acceptedTokens; // Accepted payment tokens
    address[] public acceptedTokensList; // List of accepted tokens

    // NFT listing information structure
    struct Listing {
        address seller; // Seller address
        uint256 tokenId; // NFT ID
        address paymentToken; // Payment token address
        uint256 price; // Price
        bool active; // Is active
        uint256 lastListTime; // Last listing time
        uint256 lastDelistTime; // Last delisting time
        uint256 lastPriceUpdateTime; // Last price update time
        Quality quality; // NFT quality
        uint256 level; // Card level
        uint256 accumulatedFood; // Accumulated food amount
    }

    // Listing mapping: tokenId => Listing
    mapping(uint256 => Listing) public listings;
    
    // User's listed NFTs: User address => tokenId array
    mapping(address => uint256[]) public userListings;
    
    // NFT listings categorized by quality: Quality => tokenId array
    mapping(Quality => uint256[]) public qualityListings;
    
    // TokenId existence in user listings: User address => (tokenId => exists)
    mapping(address => mapping(uint256 => bool)) public _userListingExists;
    
    // TokenId index in user listings: User address => (tokenId => index)
    mapping(address => mapping(uint256 => uint256)) private _userListingIndices;
    
    // TokenId existence in quality listings: Quality => (tokenId => exists)
    mapping(Quality => mapping(uint256 => bool)) public _qualityListingExists;
    
    // TokenId index in quality listings: Quality => (tokenId => index)
    mapping(Quality => mapping(uint256 => uint256)) private _qualityListingIndices;

    // Event definitions
    event ListingCreated(address indexed seller, uint256 indexed tokenId, address paymentToken, uint256 price, Quality quality, uint256 level, uint256 accumulatedFood);
    event ListingCancelled(address indexed seller, uint256 indexed tokenId, Quality quality);
    event ListingSold(address indexed seller, address indexed buyer, uint256 indexed tokenId, address paymentToken, uint256 price, uint256 fee, Quality quality);
    event MarketplaceInitialized(address pwnftAddress, address nftManager, address feeReceiver);
    event IndexingFailed(uint256 indexed tokenId, bytes reason);
    event ContractRenounced(address indexed previousOwner);
    event NFTTransferredToMarketplace(address indexed seller, uint256 indexed tokenId);
    event NFTReturnedToSeller(address indexed seller, uint256 indexed tokenId);
    
    // Constructor
    constructor() Ownable(msg.sender) {}
    
    // Implement IERC721Receiver interface
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
    
    // Set PwNFT contract address - only owner
    function setPwNFT(address _pwnftAddress) public onlyOwner {
        require(_pwnftAddress != address(0), "Invalid PwNFT address");
        pwnftAddress = _pwnftAddress;
    }
    
    // Set NFTManager contract address - only owner
    function setNFTManager(address _nftManager) public onlyOwner {
        require(_nftManager != address(0), "Invalid NFTManager address");
        nftManager = NFTManager(_nftManager);
    }
    
    // Set fee receiver address - only owner
    function setFeeReceiver(address _feeReceiver) public onlyOwner {
        require(_feeReceiver != address(0), "Invalid fee receiver address");
        feeReceiver = _feeReceiver;
    }
    
    // Set transaction indexer - only owner
    function setTransactionIndexer(address _indexer) external onlyOwner {
        transactionIndexer = _indexer;
    }
    
    // Set NFT feeding manager - only owner
    function setNFTFeedingManager(address _feedingManager) external onlyOwner {
        require(_feedingManager != address(0), "Invalid NFTFeedingManager address");
        nftFeedingManager = _feedingManager;
    }
    
    // Enable or disable transaction indexer - only owner
    function setIndexerEnabled(bool _enabled) external onlyOwner {
        indexerEnabled = _enabled;
    }
    
    // Modifier: Check if the token is accepted
    modifier onlyAcceptedToken(address token) {
        require(acceptedTokens[token], "Token not accepted");
        _;
    }
    
    // Modifier: Ensure NFT is from PWNFT contract
    modifier onlyPWNFT(uint256 tokenId) {
        require(IERC721(address(pwnftAddress)).ownerOf(tokenId) == msg.sender, "Not the owner of this NFT");
        _;
    }
    
    // Modifier: Check listing action cooldown
    modifier checkListingCooldown(uint256 tokenId) {
        // If this NFT has never been listed before, do not check cooldown
        if (listings[tokenId].seller != address(0)) {
            require(
                block.timestamp >= listings[tokenId].lastListTime + ACTION_COOLDOWN,
                "Listing cooldown period not passed"
            );
        }
        _;
    }
    
    // Modifier: Check price update action cooldown
    modifier checkPriceUpdateCooldown(uint256 tokenId) {
        // If this NFT has never had its price updated before, do not check cooldown
        if (listings[tokenId].lastPriceUpdateTime > 0) {
            require(
                block.timestamp >= listings[tokenId].lastPriceUpdateTime + ACTION_COOLDOWN,
                "Price update cooldown period not passed"
            );
        }
        _;
    }
    
    // Modifier: Check NFT quality, common quality (COMMON) cannot be listed
    modifier checkNFTQuality(uint256 tokenId) {
        // Get NFT quality
        NFTManager.Quality nftQuality = nftManager.tokenQuality(tokenId);
        
        // Ensure NFT is not common quality
        require(uint256(nftQuality) > uint256(Quality.COMMON), "Common NFTs cannot be listed");
        _;
    }

    // Modifier: Check if marketplace is initialized
    modifier whenInitialized() {
        require(initialized, "Marketplace not initialized");
        require(pwnftAddress != address(0), "PWNFT address not set");
        require(feeReceiver != address(0), "Fee receiver not set");
        require(address(nftManager) != address(0), "NFT Manager not set");
        _;
    }

    // Initialize marketplace - only owner
    function initialize(address _pwnftAddress, address _nftManager, address _feeReceiver) external onlyOwner {
        require(!initialized, "Marketplace already initialized");
        require(_pwnftAddress != address(0), "Invalid PWNFT address");
        require(_nftManager != address(0), "Invalid NFTManager address");
        require(_feeReceiver != address(0), "Invalid fee receiver address");
        
        pwnftAddress = _pwnftAddress;
        nftManager = NFTManager(_nftManager);
        feeReceiver = _feeReceiver;
        initialized = true;
        
        emit MarketplaceInitialized(pwnftAddress, address(nftManager), feeReceiver);
    }

    // Add accepted token - only owner
    function addAcceptedToken(address token) public onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!acceptedTokens[token], "Token already accepted");
        
        acceptedTokens[token] = true;
        acceptedTokensList.push(token);
    }
    
    // Remove accepted token - only owner
    function removeAcceptedToken(address token) public onlyOwner {
        require(acceptedTokens[token], "Token not accepted");
        
        acceptedTokens[token] = false;
        
        // Remove from the list
        for (uint i = 0; i < acceptedTokensList.length; i++) {
            if (acceptedTokensList[i] == token) {
                // Move the last element to this position and shrink the array
                acceptedTokensList[i] = acceptedTokensList[acceptedTokensList.length - 1];
                acceptedTokensList.pop();
                break;
            }
        }
    }

    // Calculate fee
    function calculateFee(uint256 price) public pure returns (uint256) {
        return (price * FEE_PERCENTAGE) / FEE_DENOMINATOR;
    }

    // Add to user listings helper function
    function _addToUserListings(address user, uint256 tokenId) private {
        if (!_userListingExists[user][tokenId]) {
            uint256 index = userListings[user].length;
            userListings[user].push(tokenId);
            _userListingExists[user][tokenId] = true;
            _userListingIndices[user][tokenId] = index;
        }
    }
    
    // Add to quality listings helper function
    function _addToQualityListings(Quality quality, uint256 tokenId) private {
        if (!_qualityListingExists[quality][tokenId]) {
            uint256 index = qualityListings[quality].length;
            qualityListings[quality].push(tokenId);
            _qualityListingExists[quality][tokenId] = true;
            _qualityListingIndices[quality][tokenId] = index;
        }
    }

    // Create NFT listing - public function
    function createListing(uint256 tokenId, address paymentToken, uint256 price) 
        public 
        nonReentrant 
        whenInitialized
        onlyPWNFT(tokenId)
        onlyAcceptedToken(paymentToken)
        checkListingCooldown(tokenId)
        checkNFTQuality(tokenId)
    {
        require(price > 0, "Price must be greater than 0");
        require(price <= MAX_PRICE, "Price exceeds maximum limit");
        require(!listings[tokenId].active || listings[tokenId].seller == msg.sender, "NFT already listed by another user");
        
        // Double check NFT ownership
        address currentOwner = IERC721(address(pwnftAddress)).ownerOf(tokenId);
        require(currentOwner == msg.sender, "Not the current owner of this NFT");
        
        // Ensure NFT is approved for the contract
        require(
            IERC721(address(pwnftAddress)).getApproved(tokenId) == address(this) || 
            IERC721(address(pwnftAddress)).isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );
        
        // Get NFT quality
        NFTManager.Quality nftQuality = nftManager.tokenQuality(tokenId);
        Quality quality = Quality(uint256(nftQuality));
        
        // Validate NFT quality conversion
        require(uint256(quality) <= uint256(Quality.LEGENDARY), "Invalid NFT quality");
        
        // Retain previous time information if a record exists, otherwise initialize
        uint256 oldDelistTime = listings[tokenId].lastDelistTime;
        uint256 oldPriceUpdateTime = listings[tokenId].lastPriceUpdateTime;
        
        // Get NFT level and accumulated food information
        uint256 level = 1; // Default level
        uint256 accumulatedFood = 0; // Default accumulated food
        
        // Try to get level info from feeding manager if set
        if (nftFeedingManager != address(0)) {
            try INFTFeedingManager(nftFeedingManager).getNFTLevelInfo(tokenId) returns (uint256 nftLevel, uint256 nftAccumulatedFood) {
                level = nftLevel;
                accumulatedFood = nftAccumulatedFood;
            } catch {
                // If failed to get level info, use default values
            }
        }
        
        // Transfer the NFT to the marketplace contract
        IERC721(address(pwnftAddress)).safeTransferFrom(msg.sender, address(this), tokenId);
        
        // Create listing
        listings[tokenId] = Listing({
            seller: msg.sender,
            tokenId: tokenId,
            paymentToken: paymentToken,
            price: price,
            active: true,
            lastListTime: block.timestamp,
            lastDelistTime: oldDelistTime,
            lastPriceUpdateTime: oldPriceUpdateTime,
            quality: quality,
            level: level,
            accumulatedFood: accumulatedFood
        });
        
        // Add to user listings
        _addToUserListings(msg.sender, tokenId);
        
        // Add to quality listings
        _addToQualityListings(quality, tokenId);
        
        emit ListingCreated(msg.sender, tokenId, paymentToken, price, quality, level, accumulatedFood);
        emit NFTTransferredToMarketplace(msg.sender, tokenId);
    }
    
    // Cancel NFT listing - public function
    function cancelListing(uint256 tokenId) 
        public 
        nonReentrant
    {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");
        
        // Verify the marketplace contract actually owns the NFT
        address currentOwner = IERC721(address(pwnftAddress)).ownerOf(tokenId);
        require(currentOwner == address(this), "NFT not in marketplace custody");
        
        // Cancel listing
        listing.active = false;
        listing.lastDelistTime = block.timestamp;
        
        // Return the NFT to the seller
        IERC721(address(pwnftAddress)).safeTransferFrom(address(this), msg.sender, tokenId);
        
        // Remove from user listings
        _removeFromUserListings(msg.sender, tokenId);
        
        // Remove from quality listings
        _removeFromQualityListings(listing.quality, tokenId);
        
        emit ListingCancelled(msg.sender, tokenId, listing.quality);
        emit NFTReturnedToSeller(msg.sender, tokenId);
    }
    
    // Buy NFT - public function
    function buyNFT(uint256 tokenId) public nonReentrant whenInitialized {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Listing not active");
        require(listing.seller != msg.sender, "Cannot buy your own NFT");
        
        // Verify the marketplace contract actually owns the NFT
        address currentOwner = IERC721(address(pwnftAddress)).ownerOf(tokenId);
        require(currentOwner == address(this), "NFT not in marketplace custody");
        
        // Save all necessary information locally to prevent re-entrancy issues
        address seller = listing.seller;
        address paymentTokenAddress = listing.paymentToken;
        uint256 price = listing.price;
        uint256 fee = calculateFee(price);
        uint256 sellerProceeds = price - fee;
        Quality quality = listing.quality;
        
        // Payment token transfer
        IERC20 paymentToken = IERC20(paymentTokenAddress);
        
        // Check buyer balance and allowance
        require(paymentToken.balanceOf(msg.sender) >= price, "Insufficient token balance");
        require(paymentToken.allowance(msg.sender, address(this)) >= price, "Insufficient token allowance");
        
        // First: execute external calls (CEI pattern - Call external functions first)
        // Pay seller
        require(paymentToken.transferFrom(msg.sender, seller, sellerProceeds), "Payment to seller failed");
        
        // Pay fee
        require(paymentToken.transferFrom(msg.sender, feeReceiver, fee), "Fee payment failed");
        
        // Transfer NFT from the marketplace contract to the buyer
        IERC721(address(pwnftAddress)).safeTransferFrom(address(this), msg.sender, tokenId);
        
        // Second: update internal state (after all external calls completed successfully)
        listing.active = false;
        
        // Remove from user listings
        _removeFromUserListings(seller, tokenId);
        
        // Remove from quality listings
        _removeFromQualityListings(quality, tokenId);
        
        // Third: emit event and handle indexing
        emit ListingSold(seller, msg.sender, tokenId, paymentTokenAddress, price, fee, quality);
        
        // If it is a rare or legendary NFT, record the transaction in the indexer
        if (quality == Quality.RARE || quality == Quality.LEGENDARY) {
            // If the indexer is enabled, add the transaction to the indexer
            if (indexerEnabled && transactionIndexer != address(0)) {
                // Get NFT level and accumulated food information if feeding manager is set
                uint256 level = 1; // Default level
                uint256 accumulatedFood = 0; // Default accumulated food
                
                if (nftFeedingManager != address(0)) {
                    try INFTFeedingManager(nftFeedingManager).getNFTLevelInfo(tokenId) returns (uint256 nftLevel, uint256 nftAccumulatedFood) {
                        level = nftLevel;
                        accumulatedFood = nftAccumulatedFood;
                    } catch {
                        // If failed to get level info, use default valuesy
                    }
                }
                
                // Index the transaction with level and accumulated food information
                try IRareNFTTransactionIndexer(transactionIndexer).indexTransaction(
                    tokenId,
                    seller,
                    msg.sender,
                    uint8(quality),
                    price,
                    block.timestamp,
                    level,
                    accumulatedFood
                ) {} catch (bytes memory reason) {
                    // Log indexing error for monitoring but don't revert the transaction
                    emit IndexingFailed(tokenId, reason);
                }
            }
        }
    }
    
    // Update listing price
    function updateListingPrice(uint256 tokenId, uint256 newPrice) 
        public 
        nonReentrant
        checkPriceUpdateCooldown(tokenId)
    {
        require(newPrice > 0, "Price must be greater than 0");
        
        Listing storage listing = listings[tokenId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");
        
        // Verify the marketplace contract actually owns the NFT
        address currentOwner = IERC721(address(pwnftAddress)).ownerOf(tokenId);
        require(currentOwner == address(this), "NFT not in marketplace custody");
        
        // Update price
        listing.price = newPrice;
        listing.lastPriceUpdateTime = block.timestamp;
        
        emit ListingCreated(msg.sender, tokenId, listing.paymentToken, newPrice, listing.quality, listing.level, listing.accumulatedFood);
    }
    
    // Remove specific tokenId from user listings - optimized version
    function _removeFromUserListings(address user, uint256 tokenId) private {
        if (!_userListingExists[user][tokenId]) {
            return;
        }
        
        uint256[] storage userNFTs = userListings[user];
        uint256 lastIndex = userNFTs.length - 1;
        uint256 index = _userListingIndices[user][tokenId];
        
        if (index != lastIndex) {
            // Get the last element's tokenId
            uint256 lastTokenId = userNFTs[lastIndex];
            
            // Move the last element to the position to be deleted
            userNFTs[index] = lastTokenId;
            
            // Update the index mapping for the moved element
            _userListingIndices[user][lastTokenId] = index;
        }
        
        // Remove the last element
        userNFTs.pop();
        
        // Update mappings
        _userListingExists[user][tokenId] = false;
        delete _userListingIndices[user][tokenId];
    }
    
    // Remove specific tokenId from quality listings - optimized version
    function _removeFromQualityListings(Quality quality, uint256 tokenId) private {
        if (!_qualityListingExists[quality][tokenId]) {
            return;
        }
        
        uint256[] storage qualityNFTs = qualityListings[quality];
        uint256 lastIndex = qualityNFTs.length - 1;
        uint256 index = _qualityListingIndices[quality][tokenId];
        
        if (index != lastIndex) {
            // Get the last element's tokenId
            uint256 lastTokenId = qualityNFTs[lastIndex];
            
            // Move the last element to the position to be deleted
            qualityNFTs[index] = lastTokenId;
            
            // Update the index mapping for the moved element
            _qualityListingIndices[quality][lastTokenId] = index;
        }
        
        // Remove the last element
        qualityNFTs.pop();
        
        // Update mappings
        _qualityListingExists[quality][tokenId] = false;
        delete _qualityListingIndices[quality][tokenId];
    }

} 