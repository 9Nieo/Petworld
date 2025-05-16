// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PetWorld is ERC20, Ownable {
    // Fixed total supply of 1 billion tokens (with 18 decimal places)
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18;
    
    // Burn events    
    event TokensBurned(address indexed burner, uint256 amount);
    
    event ContractRenounced(address indexed previousOwner);
    constructor()
        ERC20("PETWORLD", "PW")
        Ownable(msg.sender)
    {
        // Mint all tokens to the deployer address in the constructor
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
    
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
    
    // Renounce contract ownership
    function renounceContractOwnership() public onlyOwner {
        _transferOwnership(address(0));
        emit ContractRenounced(msg.sender);
    }
}
