// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {TreasuryFactory} from "../src/TreasuryFactory.sol";
import {TreasuryVault} from "../src/TreasuryVault.sol";
import {ObligationRegistry} from "../src/ObligationRegistry.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {MockStrategy} from "../src/MockStrategy.sol";

contract TreasuryFactoryTest is Test {
    TreasuryFactory internal factory;
    MockUSDC internal usdc;

    function setUp() public {
        factory = new TreasuryFactory();
        usdc = new MockUSDC();
    }

    function test_createTreasury_wiresBothContractsAndIndexesOwner() public {
        (address vaultAddress, address registryAddress, address strategyAddress) = factory.createTreasury(address(usdc), 100e6);

        TreasuryVault vault = TreasuryVault(vaultAddress);
        ObligationRegistry registry = ObligationRegistry(registryAddress);

        assertEq(vault.owner(), address(this));
        assertEq(registry.owner(), address(this));
        assertEq(vault.obligationRegistry(), registryAddress);
        assertEq(registry.vault(), vaultAddress);
        assertEq(vault.deployableCapital(), 0);
        assertEq(factory.registryForVault(vaultAddress), registryAddress);
        assertEq(factory.strategyForVault(vaultAddress), strategyAddress);
        assertEq(MockStrategy(strategyAddress).vault(), vaultAddress);
        assertEq(address(MockStrategy(strategyAddress).asset()), address(usdc));

        address[] memory treasuries = factory.getTreasuries(address(this));
        assertEq(treasuries.length, 1);
        assertEq(treasuries[0], vaultAddress);
    }

    function test_createTreasury_setsCallerAsOwner() public {
        address teamOwner = makeAddr("team-owner");
        vm.prank(teamOwner);
        (address vaultAddress, address registryAddress,) = factory.createTreasury(address(usdc), 0);

        assertEq(TreasuryVault(vaultAddress).owner(), teamOwner);
        assertEq(ObligationRegistry(registryAddress).owner(), teamOwner);
        assertEq(factory.getTreasuries(teamOwner).length, 1);
    }

    function test_createTreasury_rejectsNonContractAsset() public {
        vm.expectRevert("TreasuryFactory: invalid asset");
        factory.createTreasury(makeAddr("not-a-token"), 0);
    }
}
