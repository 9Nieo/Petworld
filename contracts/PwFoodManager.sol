// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

// Import necessary contracts
import {PwFood} from "./PwFood.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {PaymentManager} from "./PaymentManager.sol";

// Interface for NFTLotteryManager (only includes the function we need)
interface INFTLotteryManager {
    function hasClaimedFreeNFT(address user) external view returns (bool);
}

contract PwFoodManager is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // State variables
    address public pwFood;
    address public owner;
    address payable public paymentManager; // PaymentManager contract address
    address public nftLotteryManager; // NFTLotteryManager contract address
    
    // Minting amount and exchange rate
    uint256 public constant DEFAULT_MINT_AMOUNT = 100_000_000_000; // With 0 decimals
    uint256 public constant PWFOOD_PER_DOLLAR = 3000; // Amount of PWFOOD per $1 (PWFOOD has 0 decimals)
    uint256 public constant MIN_DOLLAR_AMOUNT = 1;    // Minimum payment amount ($1, without decimals)
    uint256 public constant MAX_DOLLAR_AMOUNT = 10000; // Maximum payment amount ($10000, without decimals)
    uint256 public constant PWFOOD_DAY_REWARD = 10; 

    uint256 public initMintCount; 
    // Record processed payment record indices
    mapping(uint256 => bool) public processedPayments;
    
    // Record the last claim time for users
    mapping(address => uint256) public lastClaimTime;
    
    // Event definitions
    event TokensTransferred(address indexed from, address indexed to, uint256 amount, uint256 dollarAmount);
    event PaymentProcessed(address indexed user, address indexed token, uint256 amount, uint256 pwfoodAmount, uint256 recordIndex);
    event FreePwFoodClaimed(address indexed user, uint256 amount, uint256 timestamp);
    event TokensMinted(address indexed to, uint256 amount);
    event DirectPurchase(address indexed user, address indexed payToken, uint256 payAmount, uint256 pwfoodAmount);

    // Constructor
    constructor(address _pwFood) {
        require(_pwFood != address(0), "PWFood address cannot be zero");
        pwFood = _pwFood;
        owner = msg.sender;
        initMintCount = 0;
    }
    
    
    // Function to update PWFood contract address - only owner can call
    function setPwFood(address _pwFood) public onlyOwner {
        require(_pwFood != address(0), "New address cannot be zero");
        pwFood = _pwFood;
    }
    
    // Function to update PaymentManager contract address - only owner can call
    function setPaymentManager(address _paymentManager) public onlyOwner {
        require(_paymentManager != address(0), "New address cannot be zero");
        paymentManager = payable(_paymentManager);
    }
    
    // Function to set NFTLotteryManager contract address - only owner can call
    function setNFTLotteryManager(address _nftLotteryManager) public onlyOwner {
        require(_nftLotteryManager != address(0), "New address cannot be zero");
        nftLotteryManager = _nftLotteryManager;
    }
    
    function initMint() public onlyOwner {
        require(initMintCount == 0, "Init mint count exceeded");
        PwFood(pwFood).mint(address(this), DEFAULT_MINT_AMOUNT);
        initMintCount++;
    }
    // Modifier to restrict access to owner only
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }
    
    // Modifier to restrict access to only PaymentManager
    modifier onlyPaymentManager() {
        require(msg.sender == paymentManager, "Only payment manager can call this function");
        _;
    }
    
    function claimFreePwFood() public nonReentrant {
        address to = msg.sender;
        // Checks
        uint256 currentTime = block.timestamp;
        uint256 utcDayStart = (currentTime / 86400) * 86400;
        require(lastClaimTime[to] < utcDayStart, "Today's pwfood already claimed");
        // Check if user has claimed a free NFT in NFTLotteryManager
        require(nftLotteryManager != address(0), "NFTLotteryManager not set");
        require(INFTLotteryManager(nftLotteryManager).hasClaimedFreeNFT(to), "Must claim free NFT first");
                
        uint256 pwfoodAmount = PWFOOD_DAY_REWARD;
        // Ensure the contract has enough tokens
        _ensureSufficientPwFood(pwfoodAmount);
        
        // Update status (Effects)
        lastClaimTime[to] = currentTime;
        
        // External interactions (Interactions)
        IERC20(pwFood).safeTransfer(to, pwfoodAmount);
        
        // Record events
        emit FreePwFoodClaimed(to, pwfoodAmount, currentTime);
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

    // Internal function to ensure the contract has enough tokens
    function _ensureSufficientPwFood(uint256 requiredAmount) private {
        uint256 balance = IERC20(pwFood).balanceOf(address(this));
        
        if (balance < requiredAmount) {
            // Calculate the number of tokens to mint, adding some extra amount as a buffer
            uint256 amountToMint = requiredAmount > DEFAULT_MINT_AMOUNT ? 
                                   requiredAmount : DEFAULT_MINT_AMOUNT;
            
            try PwFood(pwFood).mint(address(this), amountToMint) {
                emit TokensMinted(address(this), amountToMint);
            } catch Error(string memory reason) {
                revert(string(abi.encodePacked("Failed to mint tokens: ", reason)));
            } catch {
                revert("Failed to mint tokens: unknown error");
            }
            
            // Verify the balance after minting
            uint256 newBalance = IERC20(pwFood).balanceOf(address(this));
            require(newBalance >= requiredAmount, "Insufficient tokens after minting");
        }
    }
    
    // Get the amount of PWFOOD that can be exchanged for a specified dollar amount
    // Note: dollarAmount is in USD with 18 decimals precision, but PWFOOD has 0 decimals
    function calculatePwFoodAmount(uint256 dollarAmount) public pure returns (uint256) {
        require(dollarAmount <= MAX_DOLLAR_AMOUNT * 1e18, "Dollar amount exceeds maximum");
        return (dollarAmount * PWFOOD_PER_DOLLAR) / 1e18;
    }
    
    // Direct purchase of PWFOOD 
    // dollarAmount parameter should be in dollars with 18 decimals precision
    // For example, to buy $5 worth of PWFOOD, use dollarAmount = 5 * 10^18
    function buyPwFood(address payToken, uint256 dollarAmount) public nonReentrant {
        // checks
        require(dollarAmount >= MIN_DOLLAR_AMOUNT * 1e18 && dollarAmount <= MAX_DOLLAR_AMOUNT * 1e18, "Invalid dollar amount");
        require(paymentManager != address(0), "PaymentManager not set");
        
        // Check if token is accepted by PaymentManager
        require(PaymentManager(paymentManager).acceptedTokens(payToken), "Token not accepted");
        
        // Calculate the amount of PWFOOD to receive (with correct precision conversion)
        uint256 pwfoodAmount = calculatePwFoodAmount(dollarAmount);
        
        // Ensure sufficient tokens
        _ensureSufficientPwFood(pwfoodAmount);
        
        // Handle payment through PaymentManager
        // Convert dollarAmount to whole dollars for PaymentManager (divide by 10^18)
        uint256 wholeUsdAmount = dollarAmount / 1e18;
        PaymentManager(paymentManager).payForPWFood(payToken, wholeUsdAmount, msg.sender);
        
        // Send PWFOOD to the user
        IERC20(pwFood).safeTransfer(msg.sender, pwfoodAmount);
        
        // Emit event
        uint256 payAmount = wholeUsdAmount * PaymentManager(paymentManager).pwfoodPrice();
        emit DirectPurchase(msg.sender, payToken, payAmount, pwfoodAmount);
    }
    
    
    // Get the contract's token balance
    function getBalance() public view returns (uint256 foodBalance) {
        foodBalance = IERC20(pwFood).balanceOf(address(this));
    }

    // Function to receive tokens (if someone sends tokens directly to the contract)
    receive() external payable {
        // Do nothing, just accept the transfer
    }
}

