//SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20, Ownable {
    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) ERC20(_name, _symbol) {
        _mint(owner(), _initialSupply * (10**decimals()));
    }

    //mint tokensBits
    function mint(uint256 _tokenSupply) public onlyOwner {
        _mint(owner(), _tokenSupply * (10**decimals()));
    }

    //burn Token Bits
    function burn(uint256 _tokenBitsAmount) public onlyOwner {
        _burn(owner(), _tokenBitsAmount);
    }
}
