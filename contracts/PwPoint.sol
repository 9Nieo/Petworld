// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";


contract PwPoint is ERC20, Ownable {
    // Minter address
    address public minter;
    
    event ContractRenounced(address indexed previousOwner);
    constructor() ERC20("PWPOINT", "PWP") Ownable(msg.sender) {
        // Do not set the minter initially
        minter = msg.sender;
    }

    modifier onlyMinter() {
        require(
            msg.sender == minter || msg.sender == owner(),
            "Caller is not authorized to mint tokens"
        );
        _;
    }

    function setMinter(address _minter) external onlyOwner {
        require(_minter != address(0), "Minter cannot be the zero address");
        minter = _minter;
    }


    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "Cannot mint to the zero address");
        
        _mint(to, amount);  
    }

    function decimals() public view virtual override returns (uint8) {
        return 0;
    }


    
    // Renounce contract ownership
    function renounceContractOwnership() external onlyOwner {
        _transferOwnership(address(0));
        emit ContractRenounced(msg.sender);
    }
}
