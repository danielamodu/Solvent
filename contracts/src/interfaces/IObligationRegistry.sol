// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IObligationRegistry {
    enum Status { PENDING, FUNDED, SETTLED, CANCELLED, DEFAULTED }
    enum Priority { HIGH, MEDIUM, LOW }

    event ObligationCreated(bytes32 indexed id, address beneficiary, uint256 amount, uint256 dueAt);
    event ObligationCancelled(bytes32 indexed id);
    event ObligationSettled(bytes32 indexed id);

    function createObligation(address beneficiary, uint256 amount, uint256 dueAt, Priority priority) external returns (bytes32 id);
    function cancelObligation(bytes32 id) external;
    function settleObligation(bytes32 id) external;
    function getOutstandingAmount() external view returns (uint256);
    function protectedLiquidity() external view returns (uint256);
}
