// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PwUSD is ERC20, Ownable {

    address public minter;

    event TokensMinted(address indexed minter, address indexed to, uint256 amount);
    event TokensBurned(address indexed burner, uint256 amount);
    event ContractRenounced(address indexed previousOwner);
    
    constructor() ERC20("PWUSD", "PWUSD") Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function setMinter(address _minter) public onlyOwner {
        require(_minter != address(0), "Minter cannot be the zero address");
        minter = _minter;
    }
    
    function mint(address to, uint256 amount) public {
        require(msg.sender == minter, "caller is not the minter");
        require(to != address(0), "Cannot mint to the zero address");
        _mint(to, amount);
        emit TokensMinted(msg.sender, to, amount);
    }


    function burn(uint256 amount) public {
        require(msg.sender == minter, "caller is not the minter");
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }
} 