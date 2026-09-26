// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ObligationRegistry} from "../src/ObligationRegistry.sol";
import {IObligationRegistry} from "../src/interfaces/IObligationRegistry.sol";

contract ObligationRegistryTest is Test {
    ObligationRegistry internal registry;

    address internal owner = address(this);
    address internal beneficiary = makeAddr("beneficiary");
    address internal stranger = makeAddr("stranger");

    uint256 internal constant RESERVE = 100e6;

    function setUp() public {
        registry = new ObligationRegistry(owner, RESERVE);
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
}
