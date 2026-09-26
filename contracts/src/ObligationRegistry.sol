// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IObligationRegistry} from "./interfaces/IObligationRegistry.sol";

/// @title ObligationRegistry
/// @notice Phase 2: the ledger of the treasury's forward commitments and the
///         source of truth for how much liquidity must stay protected. Each
///         obligation reserves capital the vault must not deploy to strategies.
///         Only the owner may create, cancel, or settle obligations.
/// @dev `getOutstandingAmount()` is maintained as a running accumulator instead
///      of being recomputed by iteration: the only PENDING-entering transition
///      is creation (+amount) and the only PENDING-leaving transitions are
///      settle and cancel (-amount), so `_outstandingAmount` is always exactly
///      the sum of every PENDING obligation's amount.
contract ObligationRegistry is IObligationRegistry, Ownable {
    struct Obligation {
        bytes32 id;
        address beneficiary;
        uint256 amount;
        uint256 dueAt;
        IObligationRegistry.Priority priority;
        IObligationRegistry.Status status;
    }

    /// @notice Flat reserve that is always protected, independent of obligations.
    /// @dev Set once at construction; immutable for now (governance-tunable later).
    uint256 public immutable reserveRequirement;

    /// @notice Obligations keyed by their deterministic id.
    mapping(bytes32 => Obligation) public obligations;

    /// @dev Running sum of all PENDING obligation amounts. See contract notes.
    uint256 private _outstandingAmount;

    constructor(address initialOwner, uint256 reserveRequirement_) Ownable(initialOwner) {
        reserveRequirement = reserveRequirement_;
    }

    /// @inheritdoc IObligationRegistry
    function createObligation(address beneficiary, uint256 amount, uint256 dueAt, Priority priority)
        external
        override
        onlyOwner
        returns (bytes32 id)
    {
        require(beneficiary != address(0), "ObligationRegistry: beneficiary is zero address");
        require(amount > 0, "ObligationRegistry: amount is zero");

        id = keccak256(abi.encodePacked(msg.sender, beneficiary, amount, dueAt, block.timestamp));
        require(obligations[id].id == bytes32(0), "ObligationRegistry: obligation exists");

        obligations[id] = Obligation({
            id: id,
            beneficiary: beneficiary,
            amount: amount,
            dueAt: dueAt,
            priority: priority,
            status: Status.PENDING
        });
        _outstandingAmount += amount;

        emit ObligationCreated(id, beneficiary, amount, dueAt);
    }

    /// @inheritdoc IObligationRegistry
    function cancelObligation(bytes32 id) external override onlyOwner {
        Obligation storage o = obligations[id];
        require(o.id == id, "ObligationRegistry: unknown obligation");
        require(o.status == Status.PENDING, "ObligationRegistry: not pending");

        o.status = Status.CANCELLED;
        _outstandingAmount -= o.amount;

        emit ObligationCancelled(id);
    }

    /// @inheritdoc IObligationRegistry
    function settleObligation(bytes32 id) external override onlyOwner {
        Obligation storage o = obligations[id];
        require(o.id == id, "ObligationRegistry: unknown obligation");
        require(o.status == Status.PENDING, "ObligationRegistry: not pending");

        o.status = Status.SETTLED;
        _outstandingAmount -= o.amount;

        emit ObligationSettled(id);
    }

    /// @inheritdoc IObligationRegistry
    function getOutstandingAmount() public view override returns (uint256) {
        return _outstandingAmount;
    }

    /// @inheritdoc IObligationRegistry
    /// @dev Protected liquidity = flat reserve + every outstanding (PENDING) promise.
    function protectedLiquidity() external view override returns (uint256) {
        return reserveRequirement + _outstandingAmount;
    }
}
