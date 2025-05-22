// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PwBounty is ERC20, Ownable {
    address public minter;
    
    event ContractRenounced(address indexed previousOwner);
    constructor()
        ERC20("PWBOUNTY", "PWB")
        Ownable(msg.sender)
    {
        minter = msg.sender; 
    }

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    function mint(address to, uint256 amount) public {
        require(msg.sender == minter, "caller is not the minter");
        _mint(to, amount);
    }

    function setMinter(address newMinter) public onlyOwner {
        require(newMinter != address(0), "new minter is the zero address");
        minter = newMinter;
    }
    
}
