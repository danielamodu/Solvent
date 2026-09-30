// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IStrategyAdapter} from "./interfaces/IStrategyAdapter.sol";

interface IAaveV3Pool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/// @title AaveV3UsdcStrategy
/// @notice Testnet adapter for the official Aave V3 Arbitrum Sepolia USDC market.
/// @dev Not an audited production vault strategy. The vault is the only caller;
///      aUSDC stays in this adapter and cannot be redirected by a keeper or user.
contract AaveV3UsdcStrategy is IStrategyAdapter {
    using SafeERC20 for IERC20;

    uint256 public constant ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
    address public constant USDC = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    address public constant A_USDC = 0x460b97BD498E1157530AEb3086301d5225b91216;
    IAaveV3Pool public constant POOL = IAaveV3Pool(0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff);

    address public immutable vault;
    IERC20 public immutable asset;
    IERC20 public immutable aToken;
    uint256 public principal;

    modifier onlyVault() {
        require(msg.sender == vault, "AaveStrategy: caller is not vault");
        _;
    }

    constructor(address vault_) {
        require(block.chainid == ARBITRUM_SEPOLIA_CHAIN_ID, "AaveStrategy: wrong chain");
        require(vault_ != address(0), "AaveStrategy: vault is zero address");
        vault = vault_;
        asset = IERC20(USDC);
        aToken = IERC20(A_USDC);
    }

    function deposit(uint256 amount) external override onlyVault {
        asset.safeTransferFrom(vault, address(this), amount);
        asset.forceApprove(address(POOL), amount);
        POOL.supply(address(asset), amount, address(this), 0);
        principal += amount;
    }

    function withdraw(uint256 amount) external override onlyVault {
        require(amount <= principal, "AaveStrategy: exceeds principal");
        principal -= amount;
        uint256 withdrawn = POOL.withdraw(address(asset), amount, vault);
        require(withdrawn == amount, "AaveStrategy: partial withdrawal");
    }

    function totalValue() public view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    function availableLiquidity() public view override returns (uint256) {
        uint256 value = totalValue();
        uint256 cash = asset.balanceOf(address(aToken));
        return value < cash ? value : cash;
    }

    function claimableYield() public view override returns (uint256) {
        uint256 value = totalValue();
        return value > principal ? value - principal : 0;
    }

    function harvestYield() external override onlyVault returns (uint256 amount) {
        amount = claimableYield();
        uint256 liquid = availableLiquidity();
        if (amount > liquid) amount = liquid;
        if (amount != 0) {
            uint256 withdrawn = POOL.withdraw(address(asset), amount, vault);
            require(withdrawn == amount, "AaveStrategy: partial harvest");
        }
    }
}
