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
    address public obligationRegistry;

    /// @notice Principal currently deployed to each strategy adapter.
    mapping(address => uint256) public strategyPositions;

    /// @notice Strategies the owner has approved for deploy/recall/harvest.
    /// @dev A compromised or mistaken strategy address can trap funds or —
    ///      via a lying `harvestYield` — inflate `totalAssets` without backing,
    ///      so every strategy entrypoint requires explicit authorization. The
    ///      factory authorizes the strategy it creates during setup; the owner
    ///      can authorize replacements and revoke anything at any time.
    mapping(address => bool) public authorizedStrategies;

    /// @notice Sum of all strategy positions — principal currently out on deployment.
    uint256 public totalDeployed;

    /// @dev Canonical accounting balance, updated on deposit/withdraw. Unaffected
    ///      by deploy/recall — deployed capital remains treasury-owned.
    uint256 private _totalAssets;

    event ObligationRegistryConfigured(address indexed registry);
    event StrategyYieldHarvested(address indexed strategy, uint256 amount);
    event StrategyAuthorized(address indexed strategy);
    event StrategyRevoked(address indexed strategy);

    constructor(address asset_, address initialOwner, address obligationRegistry_) Ownable(initialOwner) {
        require(asset_ != address(0), "TreasuryVault: asset is zero address");
        asset = IERC20(asset_);
        obligationRegistry = obligationRegistry_;
    }

    /// @notice One-time registry wiring used by TreasuryFactory during atomic setup.
    function setObligationRegistry(address registry_) external onlyOwner {
        require(obligationRegistry == address(0), "TreasuryVault: registry already set");
        require(registry_ != address(0), "TreasuryVault: registry is zero address");
        obligationRegistry = registry_;
        emit ObligationRegistryConfigured(registry_);
    }

    /// @notice Approve a strategy adapter for deploy/recall/harvest.
    function authorizeStrategy(address strategy) external onlyOwner {
        require(strategy != address(0), "TreasuryVault: strategy is zero address");
        authorizedStrategies[strategy] = true;
        emit StrategyAuthorized(strategy);
    }

    /// @notice Remove a strategy adapter's approval. Existing recorded
    ///         positions stay intact and must be recalled via an authorized
    ///         path — revocation stops new flows, it does not move funds.
    function revokeStrategy(address strategy) external onlyOwner {
        authorizedStrategies[strategy] = false;
        emit StrategyRevoked(strategy);
    }

    modifier onlyAuthorizedStrategy(address strategy) {
        require(authorizedStrategies[strategy], "TreasuryVault: strategy not authorized");
        _;
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
        require(obligationRegistry != address(0), "TreasuryVault: registry not configured");
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
    function deployToStrategy(address strategy, uint256 amount) external onlyOwner onlyAuthorizedStrategy(strategy) {
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
    function recallFromStrategy(address strategy, uint256 amount) external onlyOwner onlyAuthorizedStrategy(strategy) {
        require(strategyPositions[strategy] >= amount, "TreasuryVault: recall exceeds position");

        strategyPositions[strategy] -= amount;
        totalDeployed -= amount;

        IStrategyAdapter(strategy).withdraw(amount);

        emit StrategyRecalled(strategy, amount);
    }

    /// @notice Claim strategy yield into idle vault liquidity without changing
    ///         the strategy's recorded principal position.
    function harvestStrategyYield(address strategy) external onlyOwner onlyAuthorizedStrategy(strategy) returns (uint256 amount) {
        require(strategy != address(0), "TreasuryVault: strategy is zero address");
        amount = IStrategyAdapter(strategy).harvestYield();
        _totalAssets += amount;
        emit StrategyYieldHarvested(strategy, amount);
    }
}
