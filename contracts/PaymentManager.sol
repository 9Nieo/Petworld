// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PwFoodManager} from "./PwFoodManager.sol";

contract PaymentManager is Ownable, ReentrancyGuard {
    // Token address => whether the token is accepted
    mapping(address => bool) public acceptedTokens;
    
    // List of accepted token addresses for easy lookup
    address[] public acceptedTokensList;
    
    // Payment receiver address
    address public paymentReceiver;
    
    // PWFoodManager contract address
    address public pwFoodManager;
    
    // Contract paused status
    bool public paused;
    
    // Price settings
    uint256 public constant commonLotteryPrice = 9.9 * 10**18;   // Price for common lottery
    uint256 public constant rareLotteryPrice = 99 * 10**18;     // Price for rare lottery
    uint256 public constant legendaryLotteryPrice = 599 * 10**18; // Price for legendary lottery
    uint256 public constant pwfoodPrice = 1 * 10**18;          // Price for purchasing PWFOOD token
    
    // Price limit
    uint256 public constant MAX_PRICE = 10000 * 10**18; // Maximum price $10,000
    
    // Maximum allowed quantity for purchases
    uint256 public constant MAX_QUANTITY = 10;
    
    // Record payment amounts for each address (user address => token address => amount)
    mapping(address => mapping(address => uint256)) public userPayments;
    
    // Record all paying users' addresses
    address[] public payersList;
    
    // Mapping to check if a user is in the payers list
    mapping(address => bool) private isInPayersList;
    
    // List of authorized payment agent contracts
    mapping(address => bool) public authorizedPaymentAgents;
    
    // Simplified payment record structure containing only necessary information
    struct PaymentRecord {
        address payer;
        address token;
        uint256 amount;
        string purchaseType;
        uint256 timestamp;
    }
    
    // Array of payment records
    PaymentRecord[] public paymentRecords;
    
    // Event definitions
    event PaymentReceived(address indexed token, address indexed from, uint256 amount, string purchaseType, uint256 indexed recordIndex);
    event EmergencyWithdrawAll(address indexed to, uint256 ethAmount, address[] tokens);
    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);
    event TokenWithdrawalFailed(address indexed token, uint256 amount, string reason);
    event PWFoodPaymentProcessed(address indexed payer, address indexed token, uint256 amount);
    event ContractRenounced(address indexed previousOwner);
    
    constructor(address _initialReceiver) Ownable(msg.sender) {
        require(_initialReceiver != address(0), "Invalid receiver address");
        paymentReceiver = _initialReceiver;
        paused = false;
    }
    
    // Modifier: Check if the contract is not paused
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    // Modifier: Check if the token is accepted
    modifier onlyAcceptedToken(address token) {
        require(acceptedTokens[token], "Token not accepted");
        _;
    }
    
    // Modifier: Check if the caller is an authorized payment agent or the original payer
    modifier onlyAuthorizedOrSelf(address originalPayer) {
        require(
            authorizedPaymentAgents[msg.sender] || 
            (originalPayer != address(0) && originalPayer == msg.sender), 
            "Not authorized payment agent"
        );
        _;
    }
    
    // Set payment agent contract authorization
    function setPaymentAgentAuthorization(address agent, bool status) public onlyOwner {
        require(agent != address(0), "Invalid agent address");
        authorizedPaymentAgents[agent] = status;
    }
    
    // Pause the contract
    function pause() public onlyOwner {
        require(!paused, "Contract already paused");
        paused = true;
        emit ContractPaused(msg.sender);
    }
    
    // Unpause the contract
    function unpause() public onlyOwner {
        require(paused, "Contract not paused");
        paused = false;
        emit ContractUnpaused(msg.sender);
    }
    
    // Add accepted token address
    function addAcceptedToken(address token) public onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!acceptedTokens[token], "Token already accepted");
        
        acceptedTokens[token] = true;
        acceptedTokensList.push(token);
    }
    
    // Remove accepted token address
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
    
    // Set payment receiver address
    function setPaymentReceiver(address receiver) public onlyOwner {
        require(receiver != address(0), "Invalid receiver address");
        paymentReceiver = receiver;
    }
    
    // Set PwFoodManager address
    function setPwFoodManager(address _pwFoodManager) public onlyOwner {
        require(_pwFoodManager != address(0), "Invalid PwFoodManager address");
        pwFoodManager = _pwFoodManager;
    }
    
    // Payment function - common lottery (with original payer parameter)
    function payForCommonLottery(address token, uint256 quantity, address originalPayer) public onlyAcceptedToken(token) nonReentrant whenNotPaused onlyAuthorizedOrSelf(originalPayer) {
        require(quantity > 0, "Quantity must be greater than 0");
        require(quantity <= MAX_QUANTITY, "Quantity exceeds maximum limit");
        require(originalPayer != address(0), "Payer address cannot be zero");
        
        uint256 totalAmount = commonLotteryPrice * quantity;
        require(totalAmount <= MAX_PRICE, "Total amount exceeds maximum allowed");
        
        // If originalPayer is zero address, use msg.sender as payer (this should not happen as we checked above)
        address payer = originalPayer;
        _processPayment(token, payer, totalAmount, "CommonLottery");
    }
    
    // Payment function - rare lottery (with original payer parameter)
    function payForRareLottery(address token, uint256 quantity, address originalPayer) public onlyAcceptedToken(token) nonReentrant whenNotPaused onlyAuthorizedOrSelf(originalPayer) {
        require(quantity > 0, "Quantity must be greater than 0");
        require(quantity <= MAX_QUANTITY, "Quantity exceeds maximum limit");
        require(originalPayer != address(0), "Payer address cannot be zero");
        
        uint256 totalAmount = rareLotteryPrice * quantity;
        require(totalAmount <= MAX_PRICE, "Total amount exceeds maximum allowed");
        
        // If originalPayer is zero address, use msg.sender as payer
        address payer = originalPayer;
        _processPayment(token, payer, totalAmount, "RareLottery");
    }
    
    // Payment function - legendary lottery (with original payer parameter)
    function payForLegendaryLottery(address token, uint256 quantity, address originalPayer) public onlyAcceptedToken(token) nonReentrant whenNotPaused onlyAuthorizedOrSelf(originalPayer) {
        require(quantity > 0, "Quantity must be greater than 0");
        require(quantity <= MAX_QUANTITY, "Quantity exceeds maximum limit");
        require(originalPayer != address(0), "Payer address cannot be zero");
        
        uint256 totalAmount = legendaryLotteryPrice * quantity;
        require(totalAmount <= MAX_PRICE, "Total amount exceeds maximum allowed");
        
        // If originalPayer is zero address, use msg.sender as payer
        address payer = originalPayer;
        _processPayment(token, payer, totalAmount, "LegendaryLottery");
    }
    
    // Payment function for PWFOOD purchases
    // dollarAmount should be a whole number (e.g., 1, 2, 3) representing dollars
    function payForPWFood(address token, uint256 dollarAmount, address payer) public onlyAcceptedToken(token) nonReentrant whenNotPaused onlyAuthorizedOrSelf(payer) {
        require(dollarAmount >= 1 && dollarAmount <= 10000, "Invalid dollar amount");
        require(payer != address(0), "Payer address cannot be zero");
        
        // Calculate payment amount (pwfoodPrice already has 18 decimals)
        uint256 payAmount = pwfoodPrice * dollarAmount;
        require(payAmount <= MAX_PRICE, "Amount exceeds maximum");
        
        // Check balance and allowance
        require(IERC20(token).balanceOf(payer) >= payAmount, "Insufficient token balance");
        require(IERC20(token).allowance(payer, address(this)) >= payAmount, "Token allowance too low");
        
        // Transfer payment to receiver
        bool success = IERC20(token).transferFrom(payer, paymentReceiver, payAmount);
        require(success, "Token transfer failed");
        
        // Record payment
        userPayments[payer][token] += payAmount;
        
        // Add payer to list if first payment
        if (!isInPayersList[payer]) {
            payersList.push(payer);
            isInPayersList[payer] = true;
        }
        
        // Create payment record
        uint256 recordIndex = paymentRecords.length;
        paymentRecords.push(
            PaymentRecord({
                payer: payer,
                token: token,
                amount: payAmount,
                purchaseType: "PWFOOD",
                timestamp: block.timestamp
            })
        );
        
        emit PaymentReceived(token, payer, payAmount, "PWFOOD", recordIndex);
        emit PWFoodPaymentProcessed(payer, token, payAmount);
    }
    
    // Internal payment processing function - returns record index
    function _processPayment(address token, address payer, uint256 amount, string memory purchaseType) private returns (uint256) {
        require(amount > 0, "Payment amount must be greater than 0");
        require(amount <= MAX_PRICE, "Amount exceeds maximum allowed");
        
        // Check if the user has enough tokens
        require(IERC20(token).balanceOf(payer) >= amount, "Insufficient token balance");
        
        // Check if the user has authorized enough tokens for the contract
        require(IERC20(token).allowance(payer, address(this)) >= amount, "Token allowance too low");
        
        // First perform external calls (CEI pattern - Checks, Effects, Interactions)
        // Transfer tokens to the payment receiver
        bool success = IERC20(token).transferFrom(payer, paymentReceiver, amount);
        require(success, "Token transfer failed");
        
        // Then update internal state (after external call completed successfully)
        // Record user payment amount
        userPayments[payer][token] += amount;
        
        // If the user is making their first payment, add them to the payers list
        if (!isInPayersList[payer]) {
            payersList.push(payer);
            isInPayersList[payer] = true;
        }
        
        // Create payment record
        uint256 recordIndex = paymentRecords.length;
        paymentRecords.push(
            PaymentRecord({
                payer: payer,
                token: token,
                amount: amount,
                purchaseType: purchaseType,
                timestamp: block.timestamp
            })
        );
        
        // Emit payment success event
        emit PaymentReceived(token, payer, amount, purchaseType, recordIndex);
        
        return recordIndex;
    }
    
    // Add a function to withdraw all funds from the contract
    function emergencyWithdrawAll(address to) public onlyOwner nonReentrant {
        require(to != address(0), "Invalid receiver address");
        
        // 1. Withdraw all ETH
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            // Limit gas to prevent potential issues
            (bool success, ) = payable(to).call{value: ethBalance, gas: 30000}("");
            if (!success) {
                emit TokenWithdrawalFailed(address(0), ethBalance, "ETH transfer failed");
                // Continue with token transfers even if ETH transfer fails
            }
        }
        
        // 2. Withdraw all accepted ERC20 tokens
        address[] memory tokensWithdrawn = new address[](acceptedTokensList.length);
        uint256 tokenCount = 0;
        
        for (uint i = 0; i < acceptedTokensList.length; i++) {
            address token = acceptedTokensList[i];
            if (acceptedTokens[token]) {
                uint256 tokenBalance = IERC20(token).balanceOf(address(this));
                if (tokenBalance > 0) {
                    // Try to transfer tokens, but continue even if one fails
                    try IERC20(token).transfer(to, tokenBalance) returns (bool success) {
                        if (success) {
                            tokensWithdrawn[tokenCount] = token;
                            tokenCount++;
                        } else {
                            emit TokenWithdrawalFailed(token, tokenBalance, "Transfer returned false");
                        }
                    } catch Error(string memory reason) {
                        emit TokenWithdrawalFailed(token, tokenBalance, reason);
                    } catch (bytes memory) {
                        emit TokenWithdrawalFailed(token, tokenBalance, "Unknown error");
                    }
                }
            }
        }
        
        // Resize the array to match the actual number of successfully withdrawn tokens
        assembly {
            mstore(tokensWithdrawn, tokenCount)
        }
        
        emit EmergencyWithdrawAll(to, ethBalance, tokensWithdrawn);
    }
    
    receive() external payable {
        // Optionally forward ETH automatically or leave it in the contract for later withdrawal
    }
    
    // Transfer contract ownership
    function transferContractOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        _transferOwnership(newOwner);
    }
    
    // Renounce contract ownership
    function renounceContractOwnership() external onlyOwner {
        _transferOwnership(address(0));
        emit ContractRenounced(msg.sender);
    }
} 