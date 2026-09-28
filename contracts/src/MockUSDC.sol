// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice A 6-decimal ERC-20 stand-in for USDC with an open, unrestricted
///         `mint` so the full treasury loop can be exercised on testnet without
///         Circle's rate-limited faucet.
/// @dev TESTNET ONLY. `mint` intentionally has no access control — anyone can
///      fund themselves for demos. Never deploy this to a production network.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {}

    /// @notice Decimals match Circle USDC (6), not the ERC-20 default of 18.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint `amount` base units (6 decimals) to `to`. Unrestricted faucet.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
