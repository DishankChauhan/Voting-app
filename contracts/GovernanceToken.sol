// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Governance Token for DAO
 * @dev ERC20 token with additional governance functionality
 */
contract GovernanceToken is ERC20, ERC20Permit, Ownable {
    // Maximum supply cap
    uint256 public immutable supplyCap;
    
    // Timelock for transfers after receiving tokens (anti-dump protection)
    uint256 public transferLockTime = 1 days;
    
    // Mapping to track when a user received tokens
    mapping(address => uint256) public lastTokenReceived;

    /**
     * @dev Constructor to initialize the governance token
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial amount to mint for the deployer
     * @param maxSupply Maximum possible supply cap
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        uint256 maxSupply
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(msg.sender) {
        require(initialSupply <= maxSupply, "Initial supply exceeds max supply");
        
        supplyCap = maxSupply;
        
        // Mint initial supply to the deployer
        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Mint new tokens (only owner)
     * @param to Address to receive the tokens
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply() + amount <= supplyCap, "Exceeds supply cap");
        
        _mint(to, amount);
        lastTokenReceived[to] = block.timestamp;
    }

    /**
     * @dev Override transfer to include timelock
     * @param to Recipient address
     * @param value Amount to transfer
     */
    function transfer(address to, uint256 value) public override returns (bool) {
        require(
            lastTokenReceived[msg.sender] == 0 || 
            block.timestamp >= lastTokenReceived[msg.sender] + transferLockTime,
            "Transfer locked: cooldown period active"
        );
        
        bool success = super.transfer(to, value);
        
        if (success) {
            lastTokenReceived[to] = block.timestamp;
        }
        
        return success;
    }

    /**
     * @dev Override transferFrom to include timelock
     * @param from Sender address
     * @param to Recipient address
     * @param value Amount to transfer
     */
    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        require(
            lastTokenReceived[from] == 0 || 
            block.timestamp >= lastTokenReceived[from] + transferLockTime,
            "Transfer locked: cooldown period active"
        );
        
        bool success = super.transferFrom(from, to, value);
        
        if (success) {
            lastTokenReceived[to] = block.timestamp;
        }
        
        return success;
    }

    /**
     * @dev Set the transfer lock time (cooldown period)
     * @param newLockTime New lock time in seconds
     */
    function setTransferLockTime(uint256 newLockTime) public onlyOwner {
        transferLockTime = newLockTime;
    }

    /**
     * @dev Burn tokens from caller's address
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
} 