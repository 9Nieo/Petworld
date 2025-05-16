// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {PwPointManager} from "./PwPointManager.sol";
import {PetWorld} from "./PetWorld.sol";
import {PetWorldManager} from "./PetWorldManager.sol";
import {PwPointBurner} from "./PwPointBurner.sol";

contract PwReverseBurner is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    address public owner;
    // Contract address
    address public petWorldToken;      // PetWorld token address
    address public petWorldManager;    // PetWorldManager contract address
    PwPointManager public pwPointManager;     // PwPointManager contract address
    address public pwPointBurner;      // PwPointBurner contract address for getting burn rate
    
    // Burn percentage
    uint256 public constant BURN_PERCENTAGE = 80;  // 80% burn
    uint256 public constant MANAGER_PERCENTAGE = 20; // 20% transferred to PetWorldManager
    
    // Cached burn rate
    uint256 public cachedBurnRate;  // Cached burn rate
    
    // Minimum burn rate to prevent zero exchange when there is no burn data
    uint256 public defaultMinBurnRate; // Default minimum burn rate is 100
    
    uint256 public totalReverseBurned;
    // Maximum conversion amount (10 million tokens with 18 decimals)
    uint256 public constant MAX_CONVERT_AMOUNT = 10000000 * 1e18;
    
    // Events
    event PetWorldToPwPoint(address indexed user, uint256 petWorldAmount, uint256 pwPointAmount, uint256 burnedAmount, uint256 managerAmount);
    event PetWorldToPwReverse(address indexed user, uint256 petWorldAmount, uint256 pwReverseAmount, uint256 burnedAmount, uint256 managerAmount);
    event ContractRenounced(address indexed previousOwner);
    
    constructor(
        address _petWorldToken,
        address _petWorldManager,
        address payable _pwPointManager,
        address _pwPointBurner
    ){
        require(_petWorldToken != address(0), "PetWorld token cannot be zero address");
        require(_petWorldManager != address(0), "PetWorldManager cannot be zero address");
        require(_pwPointManager != address(0), "PwPointManager cannot be zero address");
        require(_pwPointBurner != address(0), "PwPointBurner cannot be zero address");
        
        petWorldToken = _petWorldToken;
        petWorldManager = _petWorldManager;
        pwPointManager = PwPointManager(_pwPointManager);
        pwPointBurner = _pwPointBurner;
        cachedBurnRate = 100;
        defaultMinBurnRate = 100;
        totalReverseBurned = 0;

        owner = msg.sender;
    }
    
    
    /**
     * @dev Update and get the current burn rate from PwPointBurner
     * @return Current burn rate
     */
    function updateBurnRate() public returns (uint256) {
        require(pwPointBurner != address(0), "PwPointBurner not set");
        
        PwPointBurner(pwPointBurner).updateCycle();
        
        uint256 currentCycle = PwPointBurner(pwPointBurner).currentCycle();
        
        // Get cycleStats directly from the PwPointBurner contract
        (uint256 totalBurnedPoints, , , uint256 activeUsers) = PwPointBurner(pwPointBurner).cycleStats(currentCycle);
        
        // Calculate the burn rate based on points per user in the last cycle
        uint256 currentBurnRate;
        if (activeUsers > 0) {
            currentBurnRate = totalBurnedPoints / activeUsers;
        } else {
            currentBurnRate = 0;
        }
        
        // If burn rate is below default minimum, use the default
        if (currentBurnRate <= defaultMinBurnRate) {
            cachedBurnRate = defaultMinBurnRate;
            return cachedBurnRate;
        }
        
        // Get 7-day average burn rate
        (uint256 averageBurnRate,,) = PwPointBurner(pwPointBurner).getSevenDayAveragePoints();
        uint256 maxAllowedRate = (averageBurnRate * 150) / 100; // 1.5 * averageBurnRate
        
        if (maxAllowedRate > defaultMinBurnRate) {

            if (currentBurnRate > maxAllowedRate) {
                currentBurnRate = maxAllowedRate;
            }
        } else {
            currentBurnRate = defaultMinBurnRate;
        }
        
        // If the current value is different from the cache, update the cache
        if (currentBurnRate != cachedBurnRate) {
            cachedBurnRate = currentBurnRate;
        }

        return cachedBurnRate;
    }
    
    /**
     * @dev Convert PetWorld to PwPoint
     * @param petWorldAmount The amount of PetWorld to convert
     */
    function convertToPwPoint(uint256 petWorldAmount) public nonReentrant {
        // Checks
        require(petWorldToken != address(0), "PetWorld token not set");
        require(petWorldManager != address(0), "PetWorldManager not set");
        require(address(pwPointManager) != address(0), "PwPointManager not set");
        require(petWorldAmount > 0, "Amount must be greater than zero");
        require(petWorldAmount <= MAX_CONVERT_AMOUNT, "Amount exceeds maximum limit");
        
        // Make sure user has enough balance
        require(IERC20(petWorldToken).balanceOf(msg.sender) >= petWorldAmount, "Insufficient balance");
        
        // Effects - Calculate amounts first (CEI pattern)
        uint256 burnRate = updateBurnRate();
        
        // Calculate the amount of PwPoint to convert - considering precision differences
        uint256 pwPointAmount = petWorldAmount * burnRate / 1e18;
        
        // Calculate the amount of PetWorld to burn (80%)
        uint256 burnAmount = petWorldAmount * BURN_PERCENTAGE / 100;
        
        // Calculate the amount to transfer to PetWorldManager (20%)
        uint256 managerAmount = petWorldAmount - burnAmount;
        
        totalReverseBurned += petWorldAmount;
        // Interactions - External calls last (CEI pattern)
        // Transfer tokens first
        IERC20(petWorldToken).safeTransferFrom(msg.sender, address(this), petWorldAmount);
        
        // Burn PetWorld
        _burnPetWorld(burnAmount);
        
        // Transfer to manager
        IERC20(petWorldToken).safeTransfer(petWorldManager, managerAmount);
        
        // Transfer PwPoint to user
        pwPointManager.transferPwPoint(msg.sender, pwPointAmount);
        
        emit PetWorldToPwPoint(msg.sender, petWorldAmount, pwPointAmount, burnAmount, managerAmount);
    }
    
    /**
     * @dev Convert PetWorld to PwReverse
     * @param petWorldAmount The amount of PetWorld to convert
     */
    function convertToPwReverse(uint256 petWorldAmount) public nonReentrant {
        // Checks
        require(petWorldToken != address(0), "PetWorld token not set");
        require(petWorldManager != address(0), "PetWorldManager not set");
        require(address(pwPointManager) != address(0), "PwPointManager not set");
        require(petWorldAmount > 0, "Amount must be greater than zero");
        require(petWorldAmount <= MAX_CONVERT_AMOUNT, "Amount exceeds maximum limit");
        
        // Make sure user has enough balance
        require(IERC20(petWorldToken).balanceOf(msg.sender) >= petWorldAmount, "Insufficient balance");
        
        // Effects - Calculate amounts first (CEI pattern)
        uint256 burnRate = updateBurnRate();
        
        // Calculate the amount of PwReverse to convert - considering precision differences
        uint256 pwReverseAmount = petWorldAmount * burnRate / 1e18;
        
        // Calculate the amount of PetWorld to burn (80%)
        uint256 burnAmount = petWorldAmount * BURN_PERCENTAGE / 100;
        
        // Calculate the amount to transfer to PetWorldManager (20%)
        uint256 managerAmount = petWorldAmount - burnAmount;
        
        totalReverseBurned += petWorldAmount;
        // Interactions - External calls last (CEI pattern)
        // Transfer tokens first
        IERC20(petWorldToken).safeTransferFrom(msg.sender, address(this), petWorldAmount);
        
        // Burn PetWorld
        _burnPetWorld(burnAmount);
        
        // Transfer to manager
        IERC20(petWorldToken).safeTransfer(petWorldManager, managerAmount);
        
        // Transfer PwReverse to user
        pwPointManager.transferPwReverse(msg.sender, pwReverseAmount);
        
        emit PetWorldToPwReverse(msg.sender, petWorldAmount, pwReverseAmount, burnAmount, managerAmount);
    }
    
    /**
     * @dev Internal function to burn PetWorld tokens
     * @param amount The amount of tokens to burn
     */
    function _burnPetWorld(uint256 amount) private {
        require(petWorldToken != address(0), "PetWorld token not set");
        // Call the burn method of the PetWorld contract
        PetWorld(petWorldToken).burn(amount);
    }
    
    
    /**
     * @dev Update the PetWorldManager address
     * @param _petWorldManager The new PetWorldManager address
     */
    function updatePetWorldManager(address _petWorldManager) public onlyOwner {
        require(_petWorldManager != address(0), "New address cannot be zero");
        petWorldManager = _petWorldManager;
    }
    
    /**
     * @dev Update the PetWorld token address
     * @param _petWorldToken The new PetWorld token address
     */
    function updatePetWorldToken(address _petWorldToken) public onlyOwner {
        require(_petWorldToken != address(0), "New address cannot be zero");
        petWorldToken = _petWorldToken;
    }
    
    /**
     * @dev Update the PwPointBurner address
     * @param _pwPointBurner The new PwPointBurner address
     */
    function updatePwPointBurner(address _pwPointBurner) public onlyOwner {
        require(_pwPointBurner != address(0), "New address cannot be zero");
        pwPointBurner = _pwPointBurner;
    }
    
    /**
     * @dev Update the PwPointManager contract address
     * @param _pwPointManager The new PwPointManager contract address
     */
    function updatePwPointManager(address payable _pwPointManager) public onlyOwner {
        require(_pwPointManager != address(0), "New address cannot be zero");
        pwPointManager = PwPointManager(_pwPointManager);
    }
    
    /**
     * @dev Update the default minimum burn rate
     * @param _defaultMinBurnRate The new default minimum burn rate
     */
    function updateDefaultMinBurnRate(uint256 _defaultMinBurnRate) public onlyOwner {
        require(_defaultMinBurnRate > 0, "Burn rate must be greater than zero");
        defaultMinBurnRate = _defaultMinBurnRate;
    }
    
    /**
     * @dev Transfer contract ownership to a new address
     * @param newOwner The new owner address
     */
    function transferContractOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }
    
    /**
     * @dev Renounce contract ownership
     */
    function renounceContractOwnership() public onlyOwner {
        owner = address(0);
        emit ContractRenounced(msg.sender);
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }
} 