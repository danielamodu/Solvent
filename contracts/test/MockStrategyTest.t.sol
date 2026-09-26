// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
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

/// @dev The test contract itself plays the role of the vault (the only permitted
///      caller), so it deposits/withdraws directly against the strategy.
contract MockStrategyTest is Test {
    MockStrategy internal strategy;
    MockUSDC internal usdc;

    address internal vault = address(this);
    address internal stranger = makeAddr("stranger");

    function setUp() public {
        usdc = new MockUSDC();
        strategy = new MockStrategy(vault, address(usdc));

        usdc.mint(vault, 1_000e6);
        usdc.approve(address(strategy), type(uint256).max);
    }

    function test_deposit_transfers_usdc_to_strategy() public {
        strategy.deposit(100e6);
        assertEq(usdc.balanceOf(address(strategy)), 100e6);
    }

    function test_withdraw_returns_usdc_to_vault() public {
        strategy.deposit(100e6);
        strategy.withdraw(60e6);
        assertEq(usdc.balanceOf(address(strategy)), 40e6);
        assertEq(usdc.balanceOf(vault), 960e6);
    }

    function test_total_value_reflects_balance() public {
        strategy.deposit(100e6);
        assertEq(strategy.totalValue(), 100e6);
        assertEq(strategy.availableLiquidity(), 100e6);
    }

    function test_deposit_reverts_if_not_vault() public {
        vm.prank(stranger);
        vm.expectRevert();
        strategy.deposit(100e6);
    }
}
