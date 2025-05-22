// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

// Import token contracts
import {PwPoint} from "./PwPoint.sol";
import {PwBounty} from "./PwBounty.sol";
import {PwReverse} from "./PwReverse.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PwPointManager is ReentrancyGuard {
    // State variables for token contract addresses
    address public pwPoint;
    address public pwBounty;
    address public pwReverse;
    address public owner;
    
    // Pause state
    bool public paused;

    uint256 public constant DEFAULT_MINT_AMOUNT = 1_000_000_000_000;
    
    // Total transfer statistics
    uint256 public totalPwPointTransferred;
    uint256 public totalPwBountyTransferred;
    uint256 public totalPwReverseTransferred;

    uint256 public initMintCount;

    // Minter authorization mappings for each token
    mapping(address => bool) public pwPointMinters;
    mapping(address => bool) public pwBountyMinters;
    mapping(address => bool) public pwReverseMinters;
    
    // Transfer authorization mappings for each token
    mapping(address => bool) public pwPointTransferAllowed;
    mapping(address => bool) public pwBountyTransferAllowed;
    mapping(address => bool) public pwReverseTransferAllowed;

    // Events for important state changes
    event DailyTaskClaimed(address indexed to, uint256 pointAmount, uint256 bountyAmount);
    event TokensSwapped(address indexed from, string swapType, uint256 pointAmount, uint256 receivedBounty, uint256 receivedReverse);
    event MintPwPoint(address indexed minter, uint256 amount);
    event MintPwBounty(address indexed minter, uint256 amount);
    event MintPwReverse(address indexed minter, uint256 amount);
    
    // Constructor to initialize token contract addresses
    constructor(address _pwPoint, address _pwBounty, address _pwReverse) {
        require(_pwPoint != address(0), "PwPoint address cannot be zero");
        require(_pwBounty != address(0), "PwBounty address cannot be zero");
        require(_pwReverse != address(0), "PwReverse address cannot be zero");
        
        pwPoint = _pwPoint;
        pwBounty = _pwBounty;
        pwReverse = _pwReverse;
        owner = msg.sender;
        paused = false;
        
        // Initialize total transfer amounts to 0
        totalPwPointTransferred = 0;
        totalPwBountyTransferred = 0;
        totalPwReverseTransferred = 0;

        initMintCount = 0;
    }

    // Modifier to restrict access to owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }
    
    // Transfer contract ownership to a new address
    function transferContractOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
    
    // Renounce contract ownership
    function renounceContractOwnership() public onlyOwner {
        owner = address(0);
    }

    // Functions to update token contract addresses
    function setPwPoint(address _pwPoint) public onlyOwner {
        require(_pwPoint != address(0), "New address cannot be zero");
        pwPoint = _pwPoint;
    }

    function setPwBounty(address _pwBounty) public onlyOwner {
        require(_pwBounty != address(0), "New address cannot be zero");
        pwBounty = _pwBounty;
    }

    function setPwReverse(address _pwReverse) public onlyOwner {
        require(_pwReverse != address(0), "New address cannot be zero");
        pwReverse = _pwReverse;
    }

    // Modifiers to check minter authorization for each token
    modifier onlyPwPointMinter() {
        require(pwPointMinters[msg.sender], "Caller is not authorized to mint PwPoint");
        _;
    }
    
    modifier onlyPwBountyMinter() {
        require(pwBountyMinters[msg.sender], "Caller is not authorized to mint PwBounty");
        _;
    }
    
    modifier onlyPwReverseMinter() {
        require(pwReverseMinters[msg.sender], "Caller is not authorized to mint PwReverse");
        _;
    }
    
    // Modifiers to check transfer authorization for each token
    modifier onlyPwPointTransferAllowed() {
        require(pwPointTransferAllowed[msg.sender], "Caller is not authorized to transfer PwPoint");
        _;
    }
    
    modifier onlyPwBountyTransferAllowed() {
        require(pwBountyTransferAllowed[msg.sender], "Caller is not authorized to transfer PwBounty");
        _;
    }
    
    modifier onlyPwReverseTransferAllowed() {
        require(pwReverseTransferAllowed[msg.sender], "Caller is not authorized to transfer PwReverse");
        _;
    }

    // Token minting functions - only mint to this contract with fixed amount
    function mintPwPoint() public onlyPwPointMinter {
        PwPoint(pwPoint).mint(address(this), DEFAULT_MINT_AMOUNT);
        emit MintPwPoint(msg.sender, DEFAULT_MINT_AMOUNT);
    }
    
    function mintPwBounty() public onlyPwBountyMinter {
        PwBounty(pwBounty).mint(address(this), DEFAULT_MINT_AMOUNT);
        emit MintPwBounty(msg.sender, DEFAULT_MINT_AMOUNT);
    }
    
    function mintPwReverse() public onlyPwReverseMinter {
        PwReverse(pwReverse).mint(address(this), DEFAULT_MINT_AMOUNT);
        emit MintPwReverse(msg.sender, DEFAULT_MINT_AMOUNT);
    }
    
    function initMint() public onlyOwner {
        require(initMintCount == 0, "Init mint count exceeded");
        PwPoint(pwPoint).mint(address(this), DEFAULT_MINT_AMOUNT);
        PwBounty(pwBounty).mint(address(this), DEFAULT_MINT_AMOUNT);
        PwReverse(pwReverse).mint(address(this), DEFAULT_MINT_AMOUNT);
        initMintCount++;
    }
    /**
     * @dev Ensure sufficient PwPoint tokens
     * @param amount The required token amount
     */
    function _ensureSufficientPwPoint(uint256 amount) private {
        uint256 balance = IERC20(pwPoint).balanceOf(address(this));
        if (balance < amount) {
            PwPoint(pwPoint).mint(address(this), DEFAULT_MINT_AMOUNT);
        }
    }
    
    /**
     * @dev Ensure sufficient PwBounty tokens
     * @param amount The required token amount
     */
    function _ensureSufficientPwBounty(uint256 amount) private {
        uint256 balance = IERC20(pwBounty).balanceOf(address(this));
        if (balance < amount) {
            PwBounty(pwBounty).mint(address(this), DEFAULT_MINT_AMOUNT);
        }
    }
    
    /**
     * @dev Ensure sufficient PwReverse tokens
     * @param amount The required token amount
     */
    function _ensureSufficientPwReverse(uint256 amount) private {
        uint256 balance = IERC20(pwReverse).balanceOf(address(this));
        if (balance < amount) {
            PwReverse(pwReverse).mint(address(this), DEFAULT_MINT_AMOUNT);
        }
    }
    
    // Functions to transfer tokens from this contract with auto-minting if necessary
    function transferPwPoint(address to, uint256 amount) public onlyPwPointTransferAllowed {
        require(to != address(0), "Cannot transfer to the zero address");
        _ensureSufficientPwPoint(amount);
        IERC20(pwPoint).transfer(to, amount);
        totalPwPointTransferred += amount;  // Update total transferred amount
    }
    
    function transferPwBounty(address to, uint256 amount) public onlyPwBountyTransferAllowed {
        require(to != address(0), "Cannot transfer to the zero address");
        _ensureSufficientPwBounty(amount);
        IERC20(pwBounty).transfer(to, amount);
        totalPwBountyTransferred += amount;  // Update total transferred amount
    }
    
    function transferPwReverse(address to, uint256 amount) public onlyPwReverseTransferAllowed  {
        require(to != address(0), "Cannot transfer to the zero address");
        _ensureSufficientPwReverse(amount);
        IERC20(pwReverse).transfer(to, amount);
        totalPwReverseTransferred += amount;  // Update total transferred amount
    }
    
    // New feature 1: Function to claim NFT reward
    function claimNftReward(address to, uint256 pointAmount, uint256 bountyAmount) public onlyPwPointTransferAllowed {
        require(to != address(0), "Cannot transfer to the zero address");
        
        // Ensure the contract has enough tokens
        _ensureSufficientPwPoint(pointAmount);
        _ensureSufficientPwBounty(bountyAmount);
        
        // Transfer both tokens
        bool pointSuccess = IERC20(pwPoint).transfer(to, pointAmount);
        require(pointSuccess, "PwPoint transfer failed");
        
        bool bountySuccess = IERC20(pwBounty).transfer(to, bountyAmount);
        require(bountySuccess, "PwBounty transfer failed");
        
        // Update total transferred amount
        totalPwPointTransferred += pointAmount;
        totalPwBountyTransferred += bountyAmount;
        
        // Emit events
        emit DailyTaskClaimed(to, pointAmount, bountyAmount);
    }
    // New feature 2: Receive PwBounty and PwReverse from a specified address and send PwPoint
    // Remove onlyPwPointTransferAllowed modifier to allow anyone to call
    // Fixed exchange ratio: 2 PwReverse + 1 PwBounty = 3 PwPoint
    function swapBothForPoint(address from, uint256 bountyAmount, uint256 reverseAmount) public nonReentrant {
        require(from != address(0), "Source address cannot be zero");
        
        // Confirm input amounts meet fixed ratio
        require(reverseAmount % 2 == 0, "PwReverse amount must be even");
        require(bountyAmount * 2 == reverseAmount, "Must use 2 PwReverse for every 1 PwBounty");
        
        // Calculate the amount of PwPoint to be received (2 PwReverse + 1 PwBounty yields 3 PwPoint)
        uint256 pointAmount = bountyAmount * 3; // Since bountyAmount is already half of reverseAmount, multiply by 3 directly
        
        // Transfer PwBounty from user address to this contract
        bool bountySuccess = IERC20(pwBounty).transferFrom(from, address(this), bountyAmount);
        require(bountySuccess, "PwBounty transferFrom failed");
        
        // Transfer PwReverse from user address to this contract
        bool reverseSuccess = IERC20(pwReverse).transferFrom(from, address(this), reverseAmount);
        require(reverseSuccess, "PwReverse transferFrom failed");
        
        // Ensure the contract has enough PwPoint and transfer to the user
        _ensureSufficientPwPoint(pointAmount);
        bool pointSuccess = IERC20(pwPoint).transfer(from, pointAmount);
        require(pointSuccess, "PwPoint transfer failed");
        
        // Update total transferred amount
        totalPwPointTransferred += pointAmount;
        
        // Emit events
        emit TokensSwapped(from, "BothForPoint", pointAmount, bountyAmount, reverseAmount);
    }
    function inviteReward(address user, address inviter, uint256 pointAmount) public onlyPwPointTransferAllowed {
        // Ensure the contract has enough PwPoint
        _ensureSufficientPwPoint(pointAmount*2);
        // Transfer PwPoint to the user
        bool pointSuccess = IERC20(pwPoint).transfer(user, pointAmount);
        bool pointSuccess2 = IERC20(pwPoint).transfer(inviter, pointAmount);
        require(pointSuccess && pointSuccess2, "PwPoint transfer failed");
        // Update total transferred amount 
        totalPwPointTransferred += pointAmount*2;
    }
    // New feature 3: Receive PwReverse from a specified address and send PwPoint
    // Fixed exchange ratio: 1 PwReverse = 1 PwPoint
    function swapReverseForPoint(address from, uint256 reverseAmount) public nonReentrant {
        require(from != address(0), "Source address cannot be zero");
        
        // Fixed 1:1 exchange, ensure input is an integer
        uint256 pointAmount = reverseAmount;
        
        // Transfer PwReverse from user address to this contract
        bool reverseSuccess = IERC20(pwReverse).transferFrom(from, address(this), reverseAmount);
        require(reverseSuccess, "PwReverse transferFrom failed");
        
        // Ensure the contract has enough PwPoint and transfer to the user
        _ensureSufficientPwPoint(pointAmount);
        bool pointSuccess = IERC20(pwPoint).transfer(from, pointAmount);
        require(pointSuccess, "PwPoint transfer failed");
        
        // Update total transferred amount
        totalPwPointTransferred += pointAmount;
        
        // Emit events
        emit TokensSwapped(from, "ReverseForPoint", pointAmount, 0, reverseAmount);
    }
    
    // Functions to manage minter authorization
    function addPwPointMinter(address minter) public onlyOwner {
        require(minter != address(0), "Minter cannot be the zero address");
        pwPointMinters[minter] = true;
    }
    
    function removePwPointMinter(address minter) public onlyOwner {
        pwPointMinters[minter] = false;
    }
    
    function addPwBountyMinter(address minter) public onlyOwner {
        require(minter != address(0), "Minter cannot be the zero address");
        pwBountyMinters[minter] = true;
    }
    
    function removePwBountyMinter(address minter) public onlyOwner {
        pwBountyMinters[minter] = false;
    }
    
    function addPwReverseMinter(address minter) public onlyOwner {
        require(minter != address(0), "Minter cannot be the zero address");
        pwReverseMinters[minter] = true;
    }
    
    function removePwReverseMinter(address minter) public onlyOwner {
        pwReverseMinters[minter] = false;
    }
    
    // Functions to manage transfer authorization
    function addPwPointTransferAllowed(address account) public onlyOwner {
        require(account != address(0), "Account cannot be the zero address");
        pwPointTransferAllowed[account] = true; 
    }
    
    function removePwPointTransferAllowed(address account) public onlyOwner {
        pwPointTransferAllowed[account] = false;
    }
    
    function addPwBountyTransferAllowed(address account) public onlyOwner {
        require(account != address(0), "Account cannot be the zero address");
        pwBountyTransferAllowed[account] = true;
    }
    
    function removePwBountyTransferAllowed(address account) public onlyOwner {
        pwBountyTransferAllowed[account] = false;
    }
    
    function addPwReverseTransferAllowed(address account) public onlyOwner {
        require(account != address(0), "Account cannot be the zero address");
        pwReverseTransferAllowed[account] = true;
    }
    
    function removePwReverseTransferAllowed(address account) public onlyOwner {
        pwReverseTransferAllowed[account] = false;
    }
    
    // Function to get token balances of this contract
    function getBalances() public view returns (uint256 pointBalance, uint256 bountyBalance, uint256 reverseBalance) {
        pointBalance = IERC20(pwPoint).balanceOf(address(this));
        bountyBalance = IERC20(pwBounty).balanceOf(address(this));
        reverseBalance = IERC20(pwReverse).balanceOf(address(this));
    }
    
    // Function to set this contract as minter for all tokens
    // Note: This function will only work if the contract is the owner of the token contracts
    function setupMinters() public onlyOwner {
        PwPoint(pwPoint).setMinter(address(this));
        PwBounty(pwBounty).setMinter(address(this));
        PwReverse(pwReverse).setMinter(address(this));
    }
    
    // Function to receive tokens (if someone sends tokens directly to the contract)
    receive() external payable {
        // Do nothing, just accept the transfer
    }
}