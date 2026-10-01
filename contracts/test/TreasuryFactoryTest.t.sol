// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {TreasuryFactory} from "../src/TreasuryFactory.sol";
import {TreasuryVault} from "../src/TreasuryVault.sol";
import {ObligationRegistry} from "../src/ObligationRegistry.sol";
import {SolventUSD} from "../src/SolventUSD.sol";
import {MockStrategy} from "../src/MockStrategy.sol";
import {AaveV3UsdcStrategy} from "../src/AaveV3UsdcStrategy.sol";

contract TreasuryFactoryTest is Test {
    TreasuryFactory internal factory;
    SolventUSD internal usdc;

    function setUp() public {
        factory = new TreasuryFactory();
        usdc = new SolventUSD();
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
        assertTrue(vault.authorizedStrategies(strategyAddress));

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

    function test_createTreasury_deploysAaveStrategy_forOfficialUsdc() public {
        // Pretend to be Arbitrum Sepolia and stub code at the official USDC
        // reserve so the factory's asset check passes. The Aave strategy
        // constructor performs no external calls, so no fork is needed.
        vm.chainId(421614);
        address aaveUsdc = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
        vm.etch(aaveUsdc, hex"6001");
        (address vaultAddress,, address strategyAddress) = factory.createTreasury(aaveUsdc, 0);

        assertEq(address(AaveV3UsdcStrategy(strategyAddress).asset()), aaveUsdc);
        assertTrue(TreasuryVault(vaultAddress).authorizedStrategies(strategyAddress));
    }

    function test_createTreasury_deploysMockStrategy_offSepolia() public {
        // Same asset, wrong chain: falls back to the principal-only strategy.
        address aaveUsdc = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
        vm.etch(aaveUsdc, hex"6001");
        (,, address strategyAddress) = factory.createTreasury(aaveUsdc, 0);
        (bool hasPrincipal,) = strategyAddress.staticcall(abi.encodeWithSignature("principal()"));
        assertFalse(hasPrincipal);
    }
}
