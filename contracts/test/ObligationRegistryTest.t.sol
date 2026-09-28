// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ObligationRegistry} from "../src/ObligationRegistry.sol";
import {IObligationRegistry} from "../src/interfaces/IObligationRegistry.sol";

/// @dev Minimal mintable 6-decimal ERC-20 standing in for USDC in these tests.
contract MockToken is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/// @dev Stand-in for TreasuryVault: records `withdraw` calls and pays the
///      recipient from its own token balance, so settlement transfers can be
///      asserted (and revert naturally when the balance is insufficient).
contract MockVault {
    IERC20 public immutable token;
    uint256 public withdrawCalls;
    uint256 public lastAmount;
    address public lastRecipient;

    constructor(address token_) {
        token = IERC20(token_);
    }

    function withdraw(uint256 amount, address recipient) external {
        withdrawCalls++;
        lastAmount = amount;
        lastRecipient = recipient;
        token.transfer(recipient, amount);
    }
}

contract ObligationRegistryTest is Test {
    ObligationRegistry internal registry;
    MockToken internal token;
    MockVault internal mockVault;

    address internal owner = address(this);
    address internal beneficiary = makeAddr("beneficiary");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant RESERVE = 100e6;

    function setUp() public {
        token = new MockToken();
        mockVault = new MockVault(address(token));
        registry = new ObligationRegistry(owner, RESERVE, address(mockVault));

        // Fund the vault generously so settlements in the shared tests succeed.
        token.mint(address(mockVault), 10_000e6);
    }

    /// @dev Creates a PENDING obligation with fixed beneficiary/dueAt/priority.
    ///      Distinct `amount`s yield distinct ids within a single test.
    function _create(uint256 amount) internal returns (bytes32) {
        return registry.createObligation(
            beneficiary,
            amount,
            block.timestamp + 30 days,
            IObligationRegistry.Priority.MEDIUM
        );
    }

    function test_create_obligation_stores_correctly() public {
        uint256 due = block.timestamp + 30 days;
        bytes32 id = registry.createObligation(
            beneficiary,
            100e6,
            due,
            IObligationRegistry.Priority.HIGH
        );

        (
            ,
            address ben,
            uint256 amount,
            uint256 gotDue,
            ,
            IObligationRegistry.Status status
        ) = registry.obligations(id);

        assertEq(ben, beneficiary);
        assertEq(amount, 100e6);
        assertEq(gotDue, due);
        assertEq(uint256(status), uint256(IObligationRegistry.Status.PENDING));
    }

    function test_create_obligation_increases_outstanding_amount() public {
        _create(100e6);
        assertEq(registry.getOutstandingAmount(), 100e6);
    }

    function test_cancel_obligation_removes_from_outstanding() public {
        bytes32 id = _create(100e6);
        registry.cancelObligation(id);
        assertEq(registry.getOutstandingAmount(), 0);
    }

    function test_settle_obligation_removes_from_outstanding() public {
        bytes32 id = _create(100e6);
        registry.settleObligation(id);
        assertEq(registry.getOutstandingAmount(), 0);
    }

    function test_protected_liquidity_includes_reserve() public {
        _create(45e6);
        assertEq(registry.protectedLiquidity(), 145e6);
    }

    function test_multiple_obligations_sum_correctly() public {
        _create(40e6);
        _create(75e6);
        _create(30e6);
        assertEq(registry.getOutstandingAmount(), 145e6);
    }

    function test_cancelled_obligation_not_counted() public {
        _create(100e6);
        bytes32 id2 = _create(50e6);
        registry.cancelObligation(id2);
        assertEq(registry.getOutstandingAmount(), 100e6);
    }

    function test_create_reverts_if_not_owner() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.createObligation(
            beneficiary,
            100e6,
            block.timestamp + 1 days,
            IObligationRegistry.Priority.LOW
        );
    }

    function test_settle_reverts_if_already_settled() public {
        bytes32 id = _create(100e6);
        registry.settleObligation(id);
        vm.expectRevert();
        registry.settleObligation(id);
    }

    function test_cancel_reverts_if_already_cancelled() public {
        bytes32 id = _create(100e6);
        registry.cancelObligation(id);
        vm.expectRevert();
        registry.cancelObligation(id);
    }

    // ── settlement moves funds ──────────────────────────────────────────────

    function test_settle_transfers_funds_to_beneficiary() public {
        bytes32 id = _create(250e6);

        registry.settleObligation(id);

        assertEq(token.balanceOf(beneficiary), 250e6);
        assertEq(mockVault.withdrawCalls(), 1);
        assertEq(mockVault.lastAmount(), 250e6);
        assertEq(mockVault.lastRecipient(), beneficiary);
        assertEq(registry.getOutstandingAmount(), 0);
    }

    function test_settle_reverts_if_vault_has_insufficient_balance() public {
        // A registry pointed at an unfunded vault: settling a $100k obligation
        // must revert when the vault cannot pay it.
        MockVault poorVault = new MockVault(address(token));
        ObligationRegistry poorRegistry = new ObligationRegistry(owner, RESERVE, address(poorVault));

        bytes32 id = poorRegistry.createObligation(
            beneficiary,
            100_000e6,
            block.timestamp + 30 days,
            IObligationRegistry.Priority.HIGH
        );

        vm.expectRevert();
        poorRegistry.settleObligation(id);

        // The failed settlement rolled back: still outstanding, still PENDING.
        assertEq(poorRegistry.getOutstandingAmount(), 100_000e6);
        ( , , , , , IObligationRegistry.Status status) = poorRegistry.obligations(id);
        assertEq(uint256(status), uint256(IObligationRegistry.Status.PENDING));
    }
}
