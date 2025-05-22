// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract NFTManager is Ownable {
    // Define NFT quality enumeration
    enum Quality { COMMON, GOOD, EXCELLENT, RARE, LEGENDARY }
    
    // NFT information structure
    struct NFTInfo {
        string uri;         // NFT metadata URI
        uint256 maxSupply;  // Maximum supply, 0 means unlimited
        uint256 minted;     // Number of minted NFTs
        bool active;        // Whether it is mintable (default is true)
        uint256 name;       // Unique name identifier
    }
    

    // NFT information for different qualities
    mapping(Quality => mapping(uint256 => NFTInfo)) public nfts;
    
    // Total number of NFTs for each quality
    mapping(Quality => uint256) public nftCountByQuality;
    
    // Mapping to query NFT information by name
    mapping(uint256 => mapping(Quality => uint256)) public nftIdByName;
    
    // Record the current maximum name value for automatic increment
    uint256 public currentMaxName;
    
    // Store the quality and quality ID for each tokenId
    mapping(uint256 => Quality) public tokenQuality;
    mapping(uint256 => uint256) public tokenQualityId;
    
    // Store the URI for each tokenId
    mapping(uint256 => string) public _tokenURIs;
    
    // Add a separate mapping to store the minting timestamp for each tokenId
    mapping(uint256 => uint256) public mintTimestamps;
    
    // Add authorization mapping
    mapping(address => bool) public authorizedMinters;
    
    // Add remaining total counts for RARE and LEGENDARY
    uint256 public totalRareRemaining;
    uint256 public totalLegendaryRemaining;
    
    // Add authorization mapping for NFT status managers
    mapping(address => bool) public authorizedStatusManagers;
    
    // Events
    event NFTMinted(uint256 indexed tokenId, Quality quality, uint256 qualityId, uint256 timestamp);
    event NFTStatusChanged(Quality indexed quality, uint256 indexed id, bool active);
    event StatusManagerAuthorized(address indexed manager, bool authorized);
    
    constructor() Ownable(msg.sender) {}
    
    // Add authorization modifier
    modifier onlyAuthorizedMinter() {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        _;
    }
    
    // Add status manager authorization modifier
    modifier onlyAuthorizedStatusManager() {
        require(authorizedStatusManagers[msg.sender] || msg.sender == owner(), "Not authorized to manage NFT status");
        _;
    }
    
    // Add authorization management function
    function setMinterAuthorization(address _minter, bool _authorized) public onlyOwner {
        authorizedMinters[_minter] = _authorized;
    }
    
    // Add status manager authorization function
    function setStatusManagerAuthorization(address _manager, bool _authorized) public onlyOwner {
        authorizedStatusManagers[_manager] = _authorized;
        emit StatusManagerAuthorized(_manager, _authorized);
    }
    
    // Add new NFT information - simplified version with default active status as true
    function addNFT(
        Quality _quality, 
        string memory _uri, 
        uint256 _maxSupply
    ) public onlyOwner returns (uint256) {
        return addNFTWithStatus(_quality, _uri, _maxSupply, true);
    }
    
    // Full version supporting custom active status
    function addNFTWithStatus(
        Quality _quality, 
        string memory _uri, 
        uint256 _maxSupply,
        bool _active
    ) public onlyOwner returns (uint256) {
        // Add URI non-empty check
        require(bytes(_uri).length > 0, "URI cannot be empty");
        
        uint256 id = nftCountByQuality[_quality];
        nfts[_quality][id] = NFTInfo({
            uri: _uri,
            maxSupply: _maxSupply,
            minted: 0,
            active: _active,
            name: currentMaxName
        });
        
        // Add name to ID mapping relationship
        nftIdByName[currentMaxName][_quality] = id;
        
        nftCountByQuality[_quality]++;
        
        // If it is RARE or LEGENDARY quality, update the remaining total
        if (_quality == Quality.RARE) {
            totalRareRemaining += _maxSupply;
        } else if (_quality == Quality.LEGENDARY) {
            totalLegendaryRemaining += _maxSupply;
        }
        
        // Update currentMaxName
        currentMaxName++;
        
        return id;
    }
    
    // Query the remaining NFT count by name
    function getRemainingByName(uint256 _name, Quality _quality) public view returns (uint256) {
        uint256 id = nftIdByName[_name][_quality];
        require(id < nftCountByQuality[_quality], "NFT with this name does not exist");
        
        NFTInfo storage nftInfo = nfts[_quality][id];
        
        // If the maximum supply is 0, it means unlimited supply
        if (nftInfo.maxSupply == 0) {
            return type(uint256).max; // Return the maximum value to represent unlimited
        }
        
        // Otherwise, return the remaining quantity
        return nftInfo.maxSupply > nftInfo.minted ? nftInfo.maxSupply - nftInfo.minted : 0;
    }
    
    // Get complete NFT information by name
    function getNFTInfoByName(uint256 _name, Quality _quality) public view returns (
        string memory uri,
        uint256 maxSupply,
        uint256 minted,
        bool active,
        uint256 remaining
    ) {
        uint256 id = nftIdByName[_name][_quality];
        require(id < nftCountByQuality[_quality], "NFT with this name does not exist");
        
        NFTInfo storage nftInfo = nfts[_quality][id];
        
        uint256 _remaining;
        if (nftInfo.maxSupply == 0) {
            _remaining = type(uint256).max;
        } else {
            _remaining = nftInfo.maxSupply > nftInfo.minted ? nftInfo.maxSupply - nftInfo.minted : 0;
        }
        
        return (
            nftInfo.uri,
            nftInfo.maxSupply,
            nftInfo.minted,
            nftInfo.active,
            _remaining
        );
    }
    
    // Modify minting function to add authorization check
    function mintNFT(Quality _quality, uint256 _id, uint256 _tokenId) public onlyAuthorizedMinter returns (string memory) {
        require(_id < nftCountByQuality[_quality], "NFT does not exist");
        
        // Check if tokenId already exists by checking if it has a non-zero mintTimestamp
        require(mintTimestamps[_tokenId] == 0, "TokenId already minted");
        
        NFTInfo storage nftInfo = nfts[_quality][_id];
        require(nftInfo.active, "NFT is not active");
        require(nftInfo.maxSupply == 0 || nftInfo.minted < nftInfo.maxSupply, "Max supply reached");
        
        nftInfo.minted++;
        
        // Record the relationship between tokenId and quality, quality ID
        tokenQuality[_tokenId] = _quality;
        tokenQualityId[_tokenId] = _id;
        _tokenURIs[_tokenId] = nftInfo.uri;
        
        // Record minting timestamp
        mintTimestamps[_tokenId] = block.timestamp;
        
        // Trigger event
        emit NFTMinted(_tokenId, _quality, _id, block.timestamp);
        
        // If it is RARE or LEGENDARY quality, decrease the remaining total
        if (_quality == Quality.RARE) {
            totalRareRemaining--;
        } else if (_quality == Quality.LEGENDARY) {
            totalLegendaryRemaining--;
        }
        
        return nftInfo.uri;
    }
    
    // Set NFT active status
    function setNFTStatus(Quality _quality, uint256 _id, bool _active) public onlyAuthorizedStatusManager {
        require(_id < nftCountByQuality[_quality], "NFT does not exist");
        nfts[_quality][_id].active = _active;
        emit NFTStatusChanged(_quality, _id, _active);
    }
    
    // Batch set NFT active status for multiple NFTs of the same quality
    function batchSetNFTStatus(Quality _quality, uint256[] memory _ids, bool _active) public onlyAuthorizedStatusManager {
        for (uint256 i = 0; i < _ids.length; i++) {
            require(_ids[i] < nftCountByQuality[_quality], "NFT does not exist");
            nfts[_quality][_ids[i]].active = _active;
        }
        emit NFTStatusChanged(_quality, _ids[0], _active);
    }
    
    // Get the current available NFT count
    function getAvailableNFTCount(Quality _quality) public view returns (uint256 total, uint256 available) {
        uint256 nftCount = nftCountByQuality[_quality];
        uint256 availableCount = 0;
        
        for (uint256 i = 0; i < nftCount; i++) {
            NFTInfo storage nftInfo = nfts[_quality][i];
            if (nftInfo.active && (nftInfo.maxSupply == 0 || nftInfo.minted < nftInfo.maxSupply)) {
                availableCount++;
            }
        }
        
        return (nftCount, availableCount);
    }
} 