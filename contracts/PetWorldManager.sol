// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

// Import token contracts
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PetWorldManager is ReentrancyGuard {
    // State variables
    address public petWorldToken;
    address public owner;

    // Transfer authorization mapping
    mapping(address => bool) public transferAllowed;

    // Events
    event TokensTransferred(address indexed from, address indexed to, uint256 amount);
    event ContractRenounced(address indexed previousOwner);
    // SafeERC20 library
    using SafeERC20 for IERC20;

    // Constructor
    constructor(address _petWorldToken) {
        require(_petWorldToken != address(0), "PetWorld token address cannot be zero");
        
        petWorldToken = _petWorldToken;
        owner = msg.sender;
    }

    // Modifier to restrict access to owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }
    
    // Modifier to check transfer authorization
    modifier onlyTransferAllowed() {
        require(transferAllowed[msg.sender], "Caller is not authorized to transfer tokens");
        _;
    }
    
    // Update token address
    function setPetWorldToken(address _petWorldToken) public onlyOwner {
        require(_petWorldToken != address(0), "New address cannot be zero");
        petWorldToken = _petWorldToken;
    }

    // Basic transfer function
    function transferPetWorld(address to, uint256 amount) public onlyTransferAllowed nonReentrant {
        require(to != address(0), "Cannot transfer to the zero address");
        
        // Check if the contract balance is sufficient
        uint256 balance = IERC20(petWorldToken).balanceOf(address(this));
        require(balance >= amount, "Insufficient balance in contract");
        
        // Use safeTransfer instead of transfer
        IERC20(petWorldToken).safeTransfer(to, amount);
        
        emit TokensTransferred(address(this), to, amount);
    }
    
    // Manage transfer authorization
    function addTransferAllowed(address account) public onlyOwner {
        require(account != address(0), "Account cannot be the zero address");
        transferAllowed[account] = true;
    }
    
    function removeTransferAllowed(address account) public onlyOwner {
        transferAllowed[account] = false;
    }
    
    // Get balance of this contract
    function getBalance() public view returns (uint256 balance) {
        balance = IERC20(petWorldToken).balanceOf(address(this));
    }
    
    // Transfer contract ownership to a new address
    function transferContractOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
    
    // Renounce contract ownership
    function renounceContractOwnership() public onlyOwner {
        owner = address(0);
        emit ContractRenounced(msg.sender);
    }
    receive() external payable {
        // Optionally forward ETH automatically or leave it in the contract for later withdrawal
    }
} 