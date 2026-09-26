// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStrategyAdapter {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function totalValue() external view returns (uint256);
    function availableLiquidity() external view returns (uint256);
}
