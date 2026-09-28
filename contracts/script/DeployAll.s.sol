// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {ObligationRegistry} from "../src/ObligationRegistry.sol";
import {TreasuryVault} from "../src/TreasuryVault.sol";
import {MockStrategy} from "../src/MockStrategy.sol";

/// @notice Testnet deploy of the full trio on top of a freshly deployed MockUSDC
///         (open-mint faucet token) so the whole deposit -> obligation -> deploy
///         -> shortfall -> recall -> settle loop can be run without Circle's
///         rate-limited faucet.
/// @dev Deploy order (per spec): MockUSDC, ObligationRegistry, TreasuryVault,
///      MockStrategy. The vault<->registry immutable cycle is broken by predicting
///      the vault's CREATE address: MockUSDC consumes the deployer nonce n, the
///      registry lands at n+1 and the vault at n+2, so the registry is constructed
///      with the vault address predicted at n+2 and a require() asserts it held.
///      Reads PRIVATE_KEY from the environment (becomes owner). Run (from /contracts):
///        forge script script/DeployAll.s.sol --rpc-url arbitrum_sepolia --broadcast
contract DeployAll is Script {
    /// @dev 100 USDC (6 decimals) held in reserve independent of obligations.
    uint256 internal constant RESERVE_REQUIREMENT = 100_000_000;

    function run()
        external
        returns (MockUSDC usdc, ObligationRegistry registry, TreasuryVault vault, MockStrategy strategy)
    {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(deployerKey);

        // MockUSDC (n), ObligationRegistry (n+1), TreasuryVault (n+2), MockStrategy (n+3).
        // The registry needs the vault address up front, so predict the vault's
        // CREATE address at n+2.
        uint256 startNonce = vm.getNonce(owner);
        address predictedVault = vm.computeCreateAddress(owner, startNonce + 2);

        vm.startBroadcast(deployerKey);
        usdc = new MockUSDC();
        registry = new ObligationRegistry(owner, RESERVE_REQUIREMENT, predictedVault);
        vault = new TreasuryVault(address(usdc), owner, address(registry));
        strategy = new MockStrategy(address(vault), address(usdc));
        vm.stopBroadcast();

        require(address(vault) == predictedVault, "vault address prediction mismatch");

        console2.log("MockUSDC deployed:", address(usdc));
        console2.log("ObligationRegistry deployed:", address(registry));
        console2.log("  reserveRequirement:", RESERVE_REQUIREMENT);
        console2.log("  vault:", address(vault));
        console2.log("TreasuryVault deployed:", address(vault));
        console2.log("  asset (USDC):", address(usdc));
        console2.log("  owner:", owner);
        console2.log("  obligationRegistry:", address(registry));
        console2.log("MockStrategy deployed:", address(strategy));
        console2.log("  vault:", address(vault));
        console2.log("  asset (USDC):", address(usdc));
        console2.log("deployment block:", block.number);
    }
}
