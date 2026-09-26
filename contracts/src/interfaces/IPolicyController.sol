// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPolicyController {
    function reserveRequirement() external view returns (uint256);
    function maxStrategyExposure() external view returns (uint256);
    function isStrategyAllowed(address strategy) external view returns (bool);
    function deployableCapital(uint256 totalAssets, uint256 protectedLiquidity) external view returns (uint256);
}
