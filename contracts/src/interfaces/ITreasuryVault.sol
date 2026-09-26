// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITreasuryVault {
    event Deposited(address indexed depositor, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);
    event StrategyDeployed(address indexed strategy, uint256 amount);
    event StrategyRecalled(address indexed strategy, uint256 amount);

    function deposit(uint256 amount) external;
    function withdraw(uint256 amount, address recipient) external;
    function totalAssets() external view returns (uint256);
    function availableBalance() external view returns (uint256);
}
