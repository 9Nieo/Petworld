// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {NFTMarketplace} from "./NFTMarketplace.sol";

/**
 * @title RareNFTTransactionIndexer
 * @dev Contract for indexing and querying transaction records of rare and legendary NFTs
 */
contract RareNFTTransactionIndexer is Ownable {
    // Reference to the NFTMarketplace contract
    NFTMarketplace public marketplace;
    
    // Rare NFT quality enumeration (consistent with NFTMarketplace)
    enum Quality { COMMON, GOOD, EXCELLENT, RARE, LEGENDARY }
    
    // Transaction record structure
    struct NFTTransaction {
        uint256 tokenId;         // NFT ID
        address seller;          // Seller
        address buyer;           // Buyer
        Quality quality;         // NFT quality
        uint256 price;           // Price
        uint256 timestamp;       // Transaction time
        uint256 index;           // Transaction index (for sorting and pagination)
        uint256 level;           // NFT level (1-5)
        uint256 accumulatedFood; // Accumulated PWFOOD amount
    }
    
    // All transaction records (stored in the order added)
    NFTTransaction[] public transactions;
    
    // Price sorted transaction index (from high to low) - only keep the top 100
    uint256[] private priceIndices;
    
    // Time sorted transaction index (from newest to oldest) - only keep the most recent 100
    uint256[] private timeIndices;
    
    // Quality-specific indices
    mapping(Quality => uint256[]) private qualityTimeIndices;
    mapping(Quality => uint256[]) private qualityPriceIndices;
    
    // Number of items per page
    uint256 public constant PAGE_SIZE = 10;
    
    // Maximum number of records
    uint256 public constant MAX_RECORDS = 100;
    
    // Events
    event TransactionIndexed(uint256 indexed tokenId, uint256 indexed transactionIndex, uint256 price, uint256 timestamp, uint256 level, uint256 accumulatedFood);
    event MarketplaceUpdated(address indexed oldMarketplace, address indexed newMarketplace);
    event OldTransactionRemoved(uint256 indexed oldestIndex, uint256 indexed timestamp);
    event LowPriceTransactionRemoved(uint256 indexed lowestIndex, uint256 indexed price);
    
    // Constructor
    constructor(address _marketplace) Ownable(msg.sender) {
        require(_marketplace != address(0), "Invalid marketplace address");
        marketplace = NFTMarketplace(_marketplace);
    }
    
    // Set marketplace contract address - only owner
    function setMarketplace(address _marketplace) external onlyOwner {
        require(_marketplace != address(0), "Invalid marketplace address");
        address oldMarketplace = address(marketplace);
        marketplace = NFTMarketplace(_marketplace);
        emit MarketplaceUpdated(oldMarketplace, _marketplace);
    }
    
    // Add transaction record - only marketplace contract or owner
    function indexTransaction(
        uint256 tokenId,
        address seller,
        address buyer,
        uint8 qualityValue,
        uint256 price,
        uint256 timestamp,
        uint256 level,
        uint256 accumulatedFood
    ) external {
        require(
            msg.sender == address(marketplace) || msg.sender == owner(),
            "Only marketplace or owner can index transactions"
        );
        
        // Convert qualityValue to Quality enum
        Quality quality = Quality(qualityValue);
        
        // Create a new transaction record
        uint256 newIndex = transactions.length;
        NFTTransaction memory newTx = NFTTransaction({
            tokenId: tokenId,
            seller: seller,
            buyer: buyer,
            quality: quality,
            price: price,
            timestamp: timestamp,
            index: newIndex,
            level: level,
            accumulatedFood: accumulatedFood
        });
        
        // Add to the transaction record array
        transactions.push(newTx);
        
        // Add to the price index (insert in descending order, only keep the top 100)
        _insertSortedByPrice(newIndex);
        
        // Add to the time index (insert in descending order, only keep the most recent 100)
        _insertSortedByTime(newIndex);
        
        // Add to quality-specific indices
        _insertSortedByQualityPrice(newIndex, quality);
        _insertSortedByQualityTime(newIndex, quality);
        
        emit TransactionIndexed(tokenId, newIndex, price, timestamp, level, accumulatedFood);
    }
    
    /**
     * @dev Binary search to find insertion position by price
     * @param arr Array to search in
     * @param price Price to search for
     * @param useTimestampForEqual Whether to use timestamp as secondary sort key
     * @return Position where the price should be inserted and whether equal price was found
     */
    function _findInsertionPositionByPrice(
        uint256[] storage arr, 
        uint256 price, 
        bool useTimestampForEqual
    ) private view returns (uint256, bool) {
        if (arr.length == 0) {
            return (0, false);
        }
        
        uint256 left = 0;
        uint256 right = arr.length - 1;
        bool found = false;
        
        // Binary search for insertion position
        while (left <= right) {
            uint256 mid = left + (right - left) / 2;
            uint256 midPrice = transactions[arr[mid]].price;
            
            if (midPrice == price) {
                // If prices are equal and we need to use timestamp as secondary sort key
                if (useTimestampForEqual) {
                    found = true;
                    // We'll resolve equal price after the binary search to maintain order
                    break;
                } else {
                    // Just return the position if we don't need to handle equal prices specially
                    return (mid, true);
                }
            } else if (midPrice < price) {
                // Price is higher, need to go left for descending order
                if (mid == 0) {
                    return (0, false);
                }
                right = mid - 1;
            } else {
                // Price is lower, need to go right for descending order
                left = mid + 1;
            }
        }
        
        // If equal price was found, refine position based on timestamp (newer first)
        if (found) {
            // Need to find the right position among equal prices based on timestamp
            uint256 timestamp = transactions[transactions.length - 1].timestamp;
            uint256 pos = left;
            
            // Find the position for equal prices
            while (pos < arr.length && transactions[arr[pos]].price == price) {
                if (transactions[arr[pos]].timestamp < timestamp) {
                    break;
                }
                pos++;
            }
            
            return (pos, true);
        }
        
        return (left, false);
    }
    
    /**
     * @dev Binary search to find insertion position by timestamp
     * @param arr Array to search in
     * @param timestamp Timestamp to search for
     * @return Position where the timestamp should be inserted and if equal was found
     */
    function _findInsertionPositionByTime(uint256[] storage arr, uint256 timestamp) private view returns (uint256, bool) {
        if (arr.length == 0) {
            return (0, false);
        }
        
        uint256 left = 0;
        uint256 right = arr.length - 1;
        
        // Binary search for insertion position
        while (left <= right) {
            uint256 mid = left + (right - left) / 2;
            uint256 midTime = transactions[arr[mid]].timestamp;
            
            if (midTime == timestamp) {
                // Equal timestamp found, we'll need secondary sort by index
                // Find the first position with this timestamp
                uint256 pos = mid;
                while (pos > 0 && transactions[arr[pos - 1]].timestamp == timestamp) {
                    pos--;
                }
                return (pos, true);
            } else if (midTime < timestamp) {
                // Timestamp is newer, go left for descending order
                if (mid == 0) {
                    return (0, false);
                }
                right = mid - 1;
            } else {
                // Timestamp is older, go right for descending order
                left = mid + 1;
            }
        }
        
        return (left, false);
    }
    
    // Internal function: insert sorted by price (from high to low, only keep the top 100)
    function _insertSortedByPrice(uint256 index) private {
        NFTTransaction storage newTx = transactions[index];
        
        // If the price index is empty, add directly
        if (priceIndices.length == 0) {
            priceIndices.push(index);
            return;
        }
        
        // Check if insertion is needed (if there are 100 records and the current price is lower than all existing records, do not insert)
        if (priceIndices.length >= MAX_RECORDS) {
            uint256 lowestPriceIndex = priceIndices[priceIndices.length - 1];
            if (newTx.price < transactions[lowestPriceIndex].price) {
                // Price too low, do not insert
                emit LowPriceTransactionRemoved(index, newTx.price);
                return;
            } else if (newTx.price == transactions[lowestPriceIndex].price && 
                      newTx.timestamp <= transactions[lowestPriceIndex].timestamp) {
                // Same price but not newer, do not insert
                emit LowPriceTransactionRemoved(index, newTx.price);
                return;
            }
        }
        
        // Find insertion position using binary search
        (uint256 insertPos,) = _findInsertionPositionByPrice(priceIndices, newTx.price, true);
        
        // Perform insertion
        if (priceIndices.length < MAX_RECORDS) {
            // If the maximum record count has not been reached, insert directly
            _insertAt(priceIndices, insertPos, index);
        } else if (insertPos < MAX_RECORDS) {
            // If the maximum record count has been reached, but the new record has a higher price than some old records, replace the lowest price record
            uint256 removedIndex = priceIndices[MAX_RECORDS - 1];
            emit LowPriceTransactionRemoved(removedIndex, transactions[removedIndex].price);
            
            // Remove the lowest price record
            for (uint256 i = MAX_RECORDS - 1; i > insertPos; i--) {
                priceIndices[i] = priceIndices[i - 1];
            }
            priceIndices[insertPos] = index;
        }
    }
    
    // Internal function: insert sorted by time (from newest to oldest, only keep the most recent 100)
    function _insertSortedByTime(uint256 index) private {
        NFTTransaction storage newTx = transactions[index];
        
        // If the time index is empty, add directly
        if (timeIndices.length == 0) {
            timeIndices.push(index);
            return;
        }
        
        // Find insertion position using binary search
        (uint256 insertPos, bool found) = _findInsertionPositionByTime(timeIndices, newTx.timestamp);
        
        // If equal timestamp found, adjust insertion position to maintain order by index (newer indices last)
        if (found) {
            while (insertPos < timeIndices.length && 
                   transactions[timeIndices[insertPos]].timestamp == newTx.timestamp &&
                   timeIndices[insertPos] < index) {
                insertPos++;
            }
        }
        
        // Perform insertion
        if (timeIndices.length < MAX_RECORDS) {
            // If the maximum record count has not been reached, insert directly
            _insertAt(timeIndices, insertPos, index);
        } else if (insertPos < MAX_RECORDS) {
            // If the maximum record count has been reached, remove the oldest record
            uint256 removedIndex = timeIndices[MAX_RECORDS - 1];
            emit OldTransactionRemoved(removedIndex, transactions[removedIndex].timestamp);
            
            // Remove the oldest record
            for (uint256 i = MAX_RECORDS - 1; i > insertPos; i--) {
                timeIndices[i] = timeIndices[i - 1];
            }
            timeIndices[insertPos] = index;
        }
    }
    
    // Internal function: insert into quality-price index
    function _insertSortedByQualityPrice(uint256 index, Quality quality) private {
        NFTTransaction storage newTx = transactions[index];
        uint256[] storage qualityArr = qualityPriceIndices[quality];
        
        // If the array is empty, add directly
        if (qualityArr.length == 0) {
            qualityArr.push(index);
            return;
        }
        
        // Find insertion position using binary search
        (uint256 insertPos,) = _findInsertionPositionByPrice(qualityArr, newTx.price, true);
        
        // Limit array size to MAX_RECORDS
        if (qualityArr.length < MAX_RECORDS) {
            _insertAt(qualityArr, insertPos, index);
        } else if (insertPos < MAX_RECORDS) {
            // Replace lowest price
            for (uint256 i = MAX_RECORDS - 1; i > insertPos; i--) {
                qualityArr[i] = qualityArr[i - 1];
            }
            qualityArr[insertPos] = index;
        }
    }
    
    // Internal function: insert into quality-time index
    function _insertSortedByQualityTime(uint256 index, Quality quality) private {
        NFTTransaction storage newTx = transactions[index];
        uint256[] storage qualityArr = qualityTimeIndices[quality];
        
        // If the array is empty, add directly
        if (qualityArr.length == 0) {
            qualityArr.push(index);
            return;
        }
        
        // Find insertion position using binary search
        (uint256 insertPos, bool found) = _findInsertionPositionByTime(qualityArr, newTx.timestamp);
        
        // If equal timestamp found, adjust insertion position to maintain order by index
        if (found) {
            while (insertPos < qualityArr.length && 
                   transactions[qualityArr[insertPos]].timestamp == newTx.timestamp &&
                   qualityArr[insertPos] < index) {
                insertPos++;
            }
        }
        
        // Limit array size to MAX_RECORDS
        if (qualityArr.length < MAX_RECORDS) {
            _insertAt(qualityArr, insertPos, index);
        } else if (insertPos < MAX_RECORDS) {
            // Replace oldest entry
            for (uint256 i = MAX_RECORDS - 1; i > insertPos; i--) {
                qualityArr[i] = qualityArr[i - 1];
            }
            qualityArr[insertPos] = index;
        }
    }
    
    /**
     * @dev Internal function: insert an element at a specified position in the array
     * @param arr The array to modify
     * @param pos The position to insert at (must be <= arr.length)
     * @param value The value to insert
     */
    function _insertAt(uint256[] storage arr, uint256 pos, uint256 value) private {
        // Ensure pos is valid (cannot insert beyond end of array)
        require(pos <= arr.length, "Insert position out of bounds");
        
        // Extend array length
        arr.push(0);
        
        // If pos is at the end, just set the value
        if (pos == arr.length - 1) {
            arr[pos] = value;
            return;
        }
        
        // Shift elements after pos (from end to pos+1)
        for (uint256 i = arr.length - 1; i > pos; i--) {
            // Prevent underflow - additional safety check
            // This should never happen if pos is valid, but added for robustness
            if (i == 0) break;
            arr[i] = arr[i - 1];
        }
        
        // Insert value at pos
        arr[pos] = value;
    }
    
    // Get total number of transactions
    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }
    
    // Get the count of time index records
    function getTimeIndicesCount() external view returns (uint256) {
        return timeIndices.length;
    }
    
    // Get the count of price index records
    function getPriceIndicesCount() external view returns (uint256) {
        return priceIndices.length;
    }
    
    /**
     * @dev Validate page parameter to ensure it's within reasonable bounds
     * @param page The page number to validate
     * @param totalItems Total number of items available
     * @return (startIndex, endIndex, isValid) The calculated indices and validity flag
     */
    function _validateAndCalculatePagination(uint256 page, uint256 totalItems) 
        private pure returns (uint256, uint256, bool) 
    {
        // Check if there are any items
        if (totalItems == 0) {
            return (0, 0, false);
        }
        
        uint256 startIndex = page * PAGE_SIZE;
        
        // Check if page is within valid range
        if (startIndex >= totalItems) {
            return (0, 0, false);
        }
        
        uint256 endIndex = startIndex + PAGE_SIZE;
        if (endIndex > totalItems) {
            endIndex = totalItems;
        }
        
        return (startIndex, endIndex, true);
    }
    
    // Paginated query sorted by time (from newest to oldest)
    function getTransactionsByTime(uint256 page) external view returns (
        uint256[] memory tokenIds,
        address[] memory sellers,
        address[] memory buyers,
        Quality[] memory qualities,
        uint256[] memory prices,
        uint256[] memory timestamps,
        uint256[] memory levels,
        uint256[] memory accumulatedFoods
    ) {
        (uint256 startIndex, uint256 endIndex, bool isValid) = _validateAndCalculatePagination(page, timeIndices.length);
        
        // Return empty arrays if pagination is invalid
        if (!isValid) {
            return (
                new uint256[](0),
                new address[](0),
                new address[](0),
                new Quality[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0)
            );
        }
        
        uint256 resultCount = endIndex - startIndex;
        
        // Initialize return arrays
        tokenIds = new uint256[](resultCount);
        sellers = new address[](resultCount);
        buyers = new address[](resultCount);
        qualities = new Quality[](resultCount);
        prices = new uint256[](resultCount);
        timestamps = new uint256[](resultCount);
        levels = new uint256[](resultCount);
        accumulatedFoods = new uint256[](resultCount);
        
        // Fill result arrays
        for (uint256 i = 0; i < resultCount; i++) {
            NFTTransaction storage txData = transactions[timeIndices[startIndex + i]];
            tokenIds[i] = txData.tokenId;
            sellers[i] = txData.seller;
            buyers[i] = txData.buyer;
            qualities[i] = txData.quality;
            prices[i] = txData.price;
            timestamps[i] = txData.timestamp;
            levels[i] = txData.level;
            accumulatedFoods[i] = txData.accumulatedFood;
        }
        
        return (tokenIds, sellers, buyers, qualities, prices, timestamps, levels, accumulatedFoods);
    }
    
    // Paginated query sorted by price (from high to low)
    function getTransactionsByPrice(uint256 page) external view returns (
        uint256[] memory tokenIds,
        address[] memory sellers,
        address[] memory buyers,
        Quality[] memory qualities,
        uint256[] memory prices,
        uint256[] memory timestamps,
        uint256[] memory levels,
        uint256[] memory accumulatedFoods
    ) {
        (uint256 startIndex, uint256 endIndex, bool isValid) = _validateAndCalculatePagination(page, priceIndices.length);
        
        // Return empty arrays if pagination is invalid
        if (!isValid) {
            return (
                new uint256[](0),
                new address[](0),
                new address[](0),
                new Quality[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0)
            );
        }
        
        uint256 resultCount = endIndex - startIndex;
        
        // Initialize return arrays
        tokenIds = new uint256[](resultCount);
        sellers = new address[](resultCount);
        buyers = new address[](resultCount);
        qualities = new Quality[](resultCount);
        prices = new uint256[](resultCount);
        timestamps = new uint256[](resultCount);
        levels = new uint256[](resultCount);
        accumulatedFoods = new uint256[](resultCount);
        
        // Fill result arrays
        for (uint256 i = 0; i < resultCount; i++) {
            NFTTransaction storage txData = transactions[priceIndices[startIndex + i]];
            tokenIds[i] = txData.tokenId;
            sellers[i] = txData.seller;
            buyers[i] = txData.buyer;
            qualities[i] = txData.quality;
            prices[i] = txData.price;
            timestamps[i] = txData.timestamp;
            levels[i] = txData.level;
            accumulatedFoods[i] = txData.accumulatedFood;
        }
        
        return (tokenIds, sellers, buyers, qualities, prices, timestamps, levels, accumulatedFoods);
    }
    
    // Get the total number of transactions for a specific quality
    function getQualityTransactionCount(Quality quality) external view returns (uint256) {
        // This is now O(1) since we maintain quality-specific indices
        return qualityTimeIndices[quality].length;
    }
    
    // Get paginated query for transactions of a specific quality sorted by time
    function getQualityTransactionsByTime(Quality quality, uint256 page) external view returns (
        uint256[] memory tokenIds,
        address[] memory sellers,
        address[] memory buyers,
        uint256[] memory prices,
        uint256[] memory timestamps,
        uint256[] memory levels,
        uint256[] memory accumulatedFoods
    ) {
        uint256[] storage indices = qualityTimeIndices[quality];
        (uint256 startIndex, uint256 endIndex, bool isValid) = _validateAndCalculatePagination(page, indices.length);
        
        // Return empty arrays if pagination is invalid
        if (!isValid) {
            return (
                new uint256[](0),
                new address[](0),
                new address[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0)
            );
        }
        
        uint256 resultCount = endIndex - startIndex;
        
        // Initialize return arrays
        tokenIds = new uint256[](resultCount);
        sellers = new address[](resultCount);
        buyers = new address[](resultCount);
        prices = new uint256[](resultCount);
        timestamps = new uint256[](resultCount);
        levels = new uint256[](resultCount);
        accumulatedFoods = new uint256[](resultCount);
        
        // Fill result arrays
        for (uint256 i = 0; i < resultCount; i++) {
            NFTTransaction storage txData = transactions[indices[startIndex + i]];
            tokenIds[i] = txData.tokenId;
            sellers[i] = txData.seller;
            buyers[i] = txData.buyer;
            prices[i] = txData.price;
            timestamps[i] = txData.timestamp;
            levels[i] = txData.level;
            accumulatedFoods[i] = txData.accumulatedFood;
        }
        
        return (tokenIds, sellers, buyers, prices, timestamps, levels, accumulatedFoods);
    }
    
    // Get paginated query for transactions of a specific quality sorted by price
    function getQualityTransactionsByPrice(Quality quality, uint256 page) external view returns (
        uint256[] memory tokenIds,
        address[] memory sellers,
        address[] memory buyers,
        uint256[] memory prices,
        uint256[] memory timestamps,
        uint256[] memory levels,
        uint256[] memory accumulatedFoods
    ) {
        uint256[] storage indices = qualityPriceIndices[quality];
        (uint256 startIndex, uint256 endIndex, bool isValid) = _validateAndCalculatePagination(page, indices.length);
        
        // Return empty arrays if pagination is invalid
        if (!isValid) {
            return (
                new uint256[](0),
                new address[](0),
                new address[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0)
            );
        }
        
        uint256 resultCount = endIndex - startIndex;
        
        // Initialize return arrays
        tokenIds = new uint256[](resultCount);
        sellers = new address[](resultCount);
        buyers = new address[](resultCount);
        prices = new uint256[](resultCount);
        timestamps = new uint256[](resultCount);
        levels = new uint256[](resultCount);
        accumulatedFoods = new uint256[](resultCount);
        
        // Fill result arrays
        for (uint256 i = 0; i < resultCount; i++) {
            NFTTransaction storage txData = transactions[indices[startIndex + i]];
            tokenIds[i] = txData.tokenId;
            sellers[i] = txData.seller;
            buyers[i] = txData.buyer;
            prices[i] = txData.price;
            timestamps[i] = txData.timestamp;
            levels[i] = txData.level;
            accumulatedFoods[i] = txData.accumulatedFood;
        }
        
        return (tokenIds, sellers, buyers, prices, timestamps, levels, accumulatedFoods);
    }
} 