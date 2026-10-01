// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {TreasuryVault} from "../src/TreasuryVault.sol";
import {ObligationRegistry} from "../src/ObligationRegistry.sol";
import {IObligationRegistry} from "../src/interfaces/IObligationRegistry.sol";
import {MockStrategy} from "../src/MockStrategy.sol";

/// @dev Minimal mintable 6-decimal ERC-20 standing in for USDC in tests.
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract TreasuryVaultTest is Test {
    TreasuryVault internal vault;
    ObligationRegistry internal registry;
    MockUSDC internal usdc;
    MockStrategy internal strategy;

    address internal owner = address(this);
    address internal depositor = makeAddr("depositor");
    address internal recipient = makeAddr("recipient");
    address internal stranger = makeAddr("stranger");
    address internal beneficiary = makeAddr("beneficiary");

    uint256 internal constant HUNDRED = 100e6;
    uint256 internal constant RESERVE = 100e6;

    function setUp() public {
        usdc = new MockUSDC();

        // Vault and registry reference each other via immutables, so break the
        // cycle by predicting the registry's CREATE address (deployer's next
        // nonce after the vault) and wiring it into the vault up front.
        uint256 vaultNonce = vm.getNonce(address(this));
        address predictedRegistry = vm.computeCreateAddress(address(this), vaultNonce + 1);
        vault = new TreasuryVault(address(usdc), owner, predictedRegistry);
        registry = new ObligationRegistry(owner, RESERVE, address(vault));
        require(address(registry) == predictedRegistry, "registry address prediction mismatch");
        strategy = new MockStrategy(address(vault), address(usdc));
        vault.authorizeStrategy(address(strategy));

        usdc.mint(depositor, 1_000e6);
        vm.prank(depositor);
        usdc.approve(address(vault), type(uint256).max);
    }

    function _deposit(uint256 amount) internal {
        vm.prank(depositor);
        vault.deposit(amount);
    }

    function _createObligation(uint256 amount) internal returns (bytes32) {
        return registry.createObligation(
            beneficiary,
            amount,
            block.timestamp + 30 days,
            IObligationRegistry.Priority.MEDIUM
        );
    }

    // ── deposit / withdraw ────────────────────────────────────────────────

    function test_deposit_increases_totalAssets() public {
        _deposit(HUNDRED);
        assertEq(vault.totalAssets(), 100e6);
    }

    function test_withdraw_decreases_totalAssets() public {
        _deposit(HUNDRED);
        vault.withdraw(40e6, recipient);
        assertEq(vault.totalAssets(), 60e6);
    }

    function test_withdraw_sends_funds_to_recipient() public {
        _deposit(HUNDRED);
        vault.withdraw(40e6, recipient);
        assertEq(usdc.balanceOf(recipient), 40e6);
    }

    function test_withdraw_reverts_if_amount_exceeds_balance() public {
        _deposit(HUNDRED);
        vm.expectRevert();
        vault.withdraw(101e6, recipient);
    }

    function test_withdraw_reverts_if_caller_not_owner() public {
        _deposit(HUNDRED);
        vm.prank(stranger);
        vm.expectRevert();
        vault.withdraw(10e6, recipient);
    }

    function test_available_balance_equals_total_assets() public {
        _deposit(HUNDRED);
        assertEq(vault.availableBalance(), vault.totalAssets());
    }

    // ── deployable capital ────────────────────────────────────────────────

    function test_deployable_capital_decreases_with_obligations() public {
        _deposit(500e6);
        _createObligation(145e6);
        // 500e6 total - (100e6 reserve + 145e6 outstanding) = 255e6
        assertEq(vault.deployableCapital(), 255e6);
    }

    function test_deployable_capital_accounts_for_deployed() public {
        _deposit(500e6);
        _createObligation(100e6);
        // protected = 100e6 reserve + 100e6 outstanding = 200e6
        vault.deployToStrategy(address(strategy), 200e6);
        // deployable = 500e6 - 200e6 protected - 200e6 deployed = 100e6
        assertEq(vault.deployableCapital(), 100e6);
    }

    // ── deploy ──────────────────────────────────────────────────────────

    function test_deploy_to_strategy_reverts_if_exceeds_deployable() public {
        _deposit(500e6);
        _createObligation(145e6);
        // protected = 245e6, deployable = 255e6; 256e6 exceeds it
        vm.expectRevert();
        vault.deployToStrategy(address(strategy), 256e6);
    }

    function test_deploy_to_strategy_succeeds_within_limit() public {
        _deposit(500e6);
        _createObligation(145e6);
        // deployable = 255e6
        vault.deployToStrategy(address(strategy), 255e6);

        // totalAssets is unchanged — deployed capital is still treasury-owned.
        assertEq(vault.totalAssets(), 500e6);
        assertEq(vault.availableBalance(), 245e6);
        assertEq(vault.strategyPositions(address(strategy)), 255e6);
        assertEq(vault.totalDeployed(), 255e6);
        assertEq(usdc.balanceOf(address(strategy)), 255e6);
        assertEq(vault.deployableCapital(), 0);
    }

    function test_deploy_updates_strategy_position() public {
        _deposit(500e6);
        vault.deployToStrategy(address(strategy), 200e6);
        assertEq(vault.strategyPositions(address(strategy)), 200e6);
    }

    function test_deploy_updates_total_deployed() public {
        _deposit(500e6);
        vault.deployToStrategy(address(strategy), 200e6);
        assertEq(vault.totalDeployed(), 200e6);
    }

    function test_available_balance_excludes_deployed() public {
        _deposit(500e6);
        vault.deployToStrategy(address(strategy), 200e6);
        assertEq(vault.availableBalance(), 300e6);
    }

    // ── recall ────────────────────────────────────────────────────────────

    function test_recall_returns_funds() public {
        _deposit(500e6);
        vault.deployToStrategy(address(strategy), 200e6);
        vault.recallFromStrategy(address(strategy), 100e6);
        assertEq(vault.strategyPositions(address(strategy)), 100e6);
    }

    function test_recall_updates_total_deployed() public {
        _deposit(500e6);
        vault.deployToStrategy(address(strategy), 200e6);
        vault.recallFromStrategy(address(strategy), 100e6);
        assertEq(vault.totalDeployed(), 100e6);
    }

    function test_recall_reverts_if_exceeds_position() public {
        _deposit(500e6);
        vault.deployToStrategy(address(strategy), 100e6);
        vm.expectRevert();
        vault.recallFromStrategy(address(strategy), 101e6);
    }

    // ── full loop ─────────────────────────────────────────────────────────

    /// @dev End-to-end: deposit → obligation → deploy → recall → settle, asserting
    ///      the invariant boundary and accounting hold at every step.
    function test_full_loop_deposit_deploy_recall_settle() public {
        // deposit
        _deposit(500e6);
        assertEq(vault.totalAssets(), 500e6);

        // create obligation → protected = 100e6 reserve + 150e6 outstanding = 250e6
        bytes32 id = _createObligation(150e6);
        assertEq(vault.deployableCapital(), 250e6);

        // deploy the full deployable amount
        vault.deployToStrategy(address(strategy), 250e6);
        assertEq(vault.totalDeployed(), 250e6);
        assertEq(vault.availableBalance(), 250e6);
        assertEq(vault.deployableCapital(), 0);
        assertEq(strategy.totalValue(), 250e6);

        // recall it all
        vault.recallFromStrategy(address(strategy), 250e6);
        assertEq(vault.totalDeployed(), 0);
        assertEq(vault.availableBalance(), 500e6);
        assertEq(strategy.totalValue(), 0);

        // settle the obligation → the vault pays the beneficiary $150k, so
        // totalAssets drops and protected liquidity falls to just the reserve.
        registry.settleObligation(id);
        assertEq(usdc.balanceOf(beneficiary), 150e6);
        assertEq(vault.totalAssets(), 350e6);
        // deployable = 350e6 total - 100e6 reserve - 0 deployed = 250e6
        assertEq(vault.deployableCapital(), 250e6);
    }

    /// @dev The MVP "complete" loop from the spec, asserting the invariant
    ///      boundary at each step: deposit → obligation → deploy surplus →
    ///      second obligation (shortfall) → recall → settle (funds move out).
    function test_full_core_loop() public {
        // 1. deposit $500k
        _deposit(500e6);
        assertEq(vault.totalAssets(), 500e6);

        // 2. create a $145k obligation → protected = $100k reserve + $145k
        bytes32 first = _createObligation(145e6);
        assertEq(registry.protectedLiquidity(), 245e6);

        // 3. surplus free to deploy = 500 - 245 = $255k
        assertEq(vault.deployableCapital(), 255e6);

        // 4. deploy the full surplus → nothing left deployable
        vault.deployToStrategy(address(strategy), 255e6);
        assertEq(vault.deployableCapital(), 0);
        assertEq(vault.totalDeployed(), 255e6);

        // 5. a new urgent $50k obligation pushes protected to $295k > idle $245k:
        //    a liquidity shortfall, and still nothing deployable.
        _createObligation(50e6);
        assertEq(registry.protectedLiquidity(), 295e6);
        assertEq(vault.deployableCapital(), 0);

        // 6. recall $50k to restore idle liquidity
        vault.recallFromStrategy(address(strategy), 50e6);
        assertEq(vault.totalDeployed(), 205e6);
        assertEq(vault.deployableCapital(), 0); // 500 - 295 - 205

        // 7. settle the first obligation → $145k paid to the beneficiary
        registry.settleObligation(first);
        assertEq(usdc.balanceOf(beneficiary), 145e6);

        // 8. only the $50k urgent obligation remains outstanding
        assertEq(registry.getOutstandingAmount(), 50e6);
    }

    // ── strategy authorization ────────────────────────────────────────

    function test_deploy_reverts_if_strategy_not_authorized() public {
        _deposit(500e6);
        vm.expectRevert("TreasuryVault: strategy not authorized");
        vault.deployToStrategy(makeAddr("rogue-strategy"), 10e6);
    }

    function test_recall_reverts_if_strategy_not_authorized() public {
        vm.expectRevert("TreasuryVault: strategy not authorized");
        vault.recallFromStrategy(makeAddr("rogue-strategy"), 10e6);
    }

    function test_harvest_reverts_if_strategy_not_authorized() public {
        vm.expectRevert("TreasuryVault: strategy not authorized");
        vault.harvestStrategyYield(makeAddr("rogue-strategy"));
    }

    function test_authorize_and_revoke_strategy() public {
        address rogue = makeAddr("rogue-strategy");
        assertFalse(vault.authorizedStrategies(rogue));
        vault.authorizeStrategy(rogue);
        assertTrue(vault.authorizedStrategies(rogue));
        vault.revokeStrategy(rogue);
        assertFalse(vault.authorizedStrategies(rogue));
    }

    function test_authorize_reverts_if_caller_not_owner() public {
        vm.prank(stranger);
        vm.expectRevert();
        vault.authorizeStrategy(address(strategy));
    }
}
