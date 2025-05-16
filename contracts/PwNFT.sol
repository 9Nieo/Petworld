// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {NFTManager} from "./NFTManager.sol";

contract PwNFT is ERC721, Ownable {
    uint256 public _nextTokenId;
    address public minter;
    NFTManager public nftManager;
    uint256 public totalMinted;
    // Store the quality and NFT ID for each token
    mapping(uint256 => uint256) public tokenQualities;
    mapping(uint256 => uint256) public tokenNftIds;
    // Add reentrancy lock
    bool private _notEntered = true;

    event ContractRenounced(address indexed previousOwner);

    // Add reentrancy protection modifier
    modifier nonReentrant() {
        require(_notEntered, "ReentrancyGuard: reentrant call");
        _notEntered = false;
        _;
        _notEntered = true;
    }

    constructor()
        ERC721("PWNFT", "PWNFT")
        Ownable(msg.sender)
    {
        minter = msg.sender;
        totalMinted = 0;
    }
    
    function setMinter(address newMinter) public onlyOwner {
        require(newMinter != address(0), "new minter is the zero address");
        minter = newMinter;
    }

    function setNFTManager(address _nftManager) public onlyOwner {
        require(_nftManager != address(0), "New NFTManager cannot be zero address");
        nftManager = NFTManager(_nftManager); 
    }
    
    function safeMint(address to, uint256 quality, uint256 nftId) public nonReentrant returns (uint256) {
        require(msg.sender == minter, "caller is not the minter");
        
        // Increment tokenId first, then mint to avoid circular dependency issues
        uint256 tokenId = _nextTokenId++;
        
        // Get URI from NFTManager and update count
        try nftManager.mintNFT(NFTManager.Quality(quality), nftId, tokenId) {
            // Successfully minted NFT
            _safeMint(to, tokenId);
            totalMinted++;
            
            // Store NFT quality and ID information for future queries
            tokenQualities[tokenId] = quality;
            tokenNftIds[tokenId] = nftId;
            
            return tokenId;
        } catch Error(string memory reason) {
            // Error handling: revert tokenId and pass error message
            _nextTokenId--; // Revert tokenId
            revert(string(abi.encodePacked("NFT minting failed: ", reason)));
        } catch {
            // Unknown error handling
            _nextTokenId--; // Revert tokenId
            revert("NFT minting failed with unknown error");
        }
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return nftManager._tokenURIs(tokenId);
    }
    
    // Add a function to get token details for testing purposes
    function getTokenDetails(uint256 tokenId) public view returns (uint256 quality, uint256 nftId) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return (tokenQualities[tokenId], tokenNftIds[tokenId]);
    }
    
    
    // Renounce contract ownership
    function renounceContractOwnership() public onlyOwner {
        _transferOwnership(address(0));
        emit ContractRenounced(msg.sender);
    }
}
