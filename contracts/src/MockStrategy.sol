// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IStrategyAdapter} from "./interfaces/IStrategyAdapter.sol";

/// @title MockStrategy
/// @notice Phase 3: the single hackathon strategy. Custodies USDC pulled from
///         the vault and returns it on withdraw. No yield is simulated —
///         `totalValue()` is pure principal (its live USDC balance).
/// @dev Only the wiring vault may move funds in or out.
contract MockStrategy is IStrategyAdapter {
    using SafeERC20 for IERC20;

    /// @notice The vault permitted to deposit into / withdraw from this strategy.
    address public immutable vault;

    /// @notice The ERC-20 asset managed by this strategy (USDC).
    IERC20 public immutable asset;

    modifier onlyVault() {
        require(msg.sender == vault, "MockStrategy: caller is not the vault");
        _;
    }

    constructor(address vault_, address asset_) {
        require(vault_ != address(0), "MockStrategy: vault is zero address");
        require(asset_ != address(0), "MockStrategy: asset is zero address");
        vault = vault_;
        asset = IERC20(asset_);
    }

    /// @inheritdoc IStrategyAdapter
    /// @dev Pulls `amount` from the vault; the vault must have approved this
    ///      strategy first.
    function deposit(uint256 amount) external override onlyVault {
        asset.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @inheritdoc IStrategyAdapter
    /// @dev Pushes `amount` back to the vault (the only permitted caller).
    function withdraw(uint256 amount) external override onlyVault {
        asset.safeTransfer(msg.sender, amount);
    }

    /// @inheritdoc IStrategyAdapter
    function totalValue() external view override returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /// @inheritdoc IStrategyAdapter
    function availableLiquidity() external view override returns (uint256) {
        return asset.balanceOf(address(this));
    }
}
