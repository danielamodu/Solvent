// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {ObligationRegistry} from "../src/ObligationRegistry.sol";
import {TreasuryVault} from "../src/TreasuryVault.sol";
import {MockStrategy} from "../src/MockStrategy.sol";

/// @notice Phase 4 deploy: a TreasuryVault, an ObligationRegistry wired to it,
///         and a MockStrategy wired to that vault — all owned by the deployer.
/// @dev The vault authorises the registry to `withdraw` on settlement and the
///      registry stores the vault, so the two reference each other and must be
///      co-deployed. The vault's `obligationRegistry` is immutable, so we predict
///      the registry's CREATE address (deployer nonce + 1) and pass it to the
///      vault, then deploy the registry at exactly that address.
///      Reads from the environment:
///        NEXT_PUBLIC_USDC_ADDRESS               - ERC-20 asset (USDC) address
///        NEXT_PUBLIC_TREASURY_VAULT_ADDRESS     - prior vault (logged for reference)
///        PRIVATE_KEY                            - deployer key; becomes owner
///      After running, set NEXT_PUBLIC_TREASURY_VAULT_ADDRESS,
///      NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS and NEXT_PUBLIC_MOCK_STRATEGY_ADDRESS
///      to the logged addresses.
///      Run (from /contracts):
///        forge script script/DeployObligationRegistry.s.sol \
///          --rpc-url arbitrum_sepolia --broadcast
contract DeployObligationRegistry is Script {
    /// @dev 100 USDC (6 decimals) held in reserve independent of obligations.
    uint256 internal constant RESERVE_REQUIREMENT = 100_000_000;

    function run() external returns (ObligationRegistry registry, TreasuryVault vault, MockStrategy strategy) {
        address usdc = vm.envAddress("NEXT_PUBLIC_USDC_ADDRESS");
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(deployerKey);
        address previousVault = vm.envOr("NEXT_PUBLIC_TREASURY_VAULT_ADDRESS", address(0));

        // Break the vault<->registry immutable cycle: the vault is deployed first
        // (at the current nonce) and the registry next (nonce + 1).
        uint256 vaultNonce = vm.getNonce(owner);
        address predictedRegistry = vm.computeCreateAddress(owner, vaultNonce + 1);

        vm.startBroadcast(deployerKey);
        vault = new TreasuryVault(usdc, owner, predictedRegistry);
        registry = new ObligationRegistry(owner, RESERVE_REQUIREMENT, address(vault));
        strategy = new MockStrategy(address(vault), usdc);
        vm.stopBroadcast();

        require(address(registry) == predictedRegistry, "registry address prediction mismatch");

        console2.log("TreasuryVault (new) deployed:", address(vault));
        console2.log("  asset (USDC):", usdc);
        console2.log("  owner:", owner);
        console2.log("ObligationRegistry deployed:", address(registry));
        console2.log("  reserveRequirement:", RESERVE_REQUIREMENT);
        console2.log("  vault:", address(vault));
        console2.log("MockStrategy deployed:", address(strategy));
        console2.log("  vault:", address(vault));
        console2.log("deployment block:", block.number);
        console2.log("previous TreasuryVault (from env, reference):", previousVault);
    }
}
