// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {ITreasuryVault} from "./interfaces/ITreasuryVault.sol";
import {IObligationRegistry} from "./interfaces/IObligationRegistry.sol";
import {IStrategyAdapter} from "./interfaces/IStrategyAdapter.sol";

/// @title TreasuryVault
/// @notice Custody of a single ERC-20 (USDC). Deposits are open; withdrawals are
///         owner-only. `totalAssets` is canonical accounting, NOT the raw token
///         balance: capital deployed to a strategy is still owned by the treasury,
///         so `totalAssets` is unchanged by a deploy. The idle (physically held)
///         portion is exposed via `availableBalance = totalAssets - totalDeployed`.
/// @dev    `deployableCapital()` is the core invariant boundary: capital the
///         treasury has already promised (protected liquidity) or already deployed
///         can never be (re)deployed to a strategy.
contract TreasuryVault is ITreasuryVault, Ownable {
    using SafeERC20 for IERC20;

    /// @notice The ERC-20 asset held by this vault (USDC).
    IERC20 public immutable asset;

    /// @notice Registry of outstanding obligations that gates deployable capital.
    address public immutable obligationRegistry;

    /// @notice Principal currently deployed to each strategy adapter.
    mapping(address => uint256) public strategyPositions;

    /// @notice Sum of all strategy positions — principal currently out on deployment.
    uint256 public totalDeployed;

    /// @dev Canonical accounting balance, updated on deposit/withdraw. Unaffected
    ///      by deploy/recall — deployed capital remains treasury-owned.
    uint256 private _totalAssets;

    constructor(address asset_, address initialOwner, address obligationRegistry_) Ownable(initialOwner) {
        require(asset_ != address(0), "TreasuryVault: asset is zero address");
        require(obligationRegistry_ != address(0), "TreasuryVault: registry is zero address");
        asset = IERC20(asset_);
        obligationRegistry = obligationRegistry_;
    }

    /// @inheritdoc ITreasuryVault
    function deposit(uint256 amount) external override {
        asset.safeTransferFrom(msg.sender, address(this), amount);
        _totalAssets += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @inheritdoc ITreasuryVault
    /// @dev Bounded by idle balance: deployed capital must be recalled first.
    ///      Callable by the owner (manual withdrawals) or the obligation registry
    ///      (paying a beneficiary on settlement) — the registry is trusted and
    ///      wired in at construction.
    function withdraw(uint256 amount, address recipient) external override {
        require(
            msg.sender == owner() || msg.sender == obligationRegistry,
            "TreasuryVault: not authorized"
        );
        require(amount <= availableBalance(), "TreasuryVault: insufficient balance");
        _totalAssets -= amount;
        asset.safeTransfer(recipient, amount);
        emit Withdrawn(recipient, amount);
    }

    /// @inheritdoc ITreasuryVault
    /// @dev Tracks deposits/withdrawals only; excludes unrealised strategy gains (MVP).
    function totalAssets() public view override returns (uint256) {
        return _totalAssets;
    }

    /// @inheritdoc ITreasuryVault
    /// @notice Idle USDC physically in the vault: total assets minus what's deployed.
    function availableBalance() public view override returns (uint256) {
        return _totalAssets - totalDeployed;
    }

    /// @notice Capital free to deploy after protected liquidity and existing
    ///         deployments: deployable = totalAssets - protectedLiquidity - totalDeployed.
    function deployableCapital() public view returns (uint256) {
        uint256 protected = IObligationRegistry(obligationRegistry).protectedLiquidity();
        if (protected >= _totalAssets) {
            return 0;
        }
        uint256 unprotected = _totalAssets - protected;
        if (totalDeployed >= unprotected) {
            return 0;
        }
        return unprotected - totalDeployed;
    }

    /// @notice Deploy idle capital to a strategy adapter, enforcing the core
    ///         invariant that promised or already-deployed capital is never used.
    /// @dev Assets remain treasury-owned; only `strategyPositions`/`totalDeployed`
    ///      move. Effects precede the external adapter call (checks-effects-interactions).
    function deployToStrategy(address strategy, uint256 amount) external onlyOwner {
        require(strategy != address(0), "TreasuryVault: strategy is zero address");
        require(amount <= deployableCapital(), "Insufficient deployable capital");

        strategyPositions[strategy] += amount;
        totalDeployed += amount;

        asset.forceApprove(strategy, amount);
        IStrategyAdapter(strategy).deposit(amount);

        emit StrategyDeployed(strategy, amount);
    }

    /// @notice Pull deployed capital back from a strategy into the vault.
    /// @dev Restores idle balance; `totalAssets` is unchanged (capital was always
    ///      treasury-owned). Effects precede the external adapter call.
    function recallFromStrategy(address strategy, uint256 amount) external onlyOwner {
        require(strategyPositions[strategy] >= amount, "TreasuryVault: recall exceeds position");

        strategyPositions[strategy] -= amount;
        totalDeployed -= amount;

        IStrategyAdapter(strategy).withdraw(amount);

        emit StrategyRecalled(strategy, amount);
    }
}
