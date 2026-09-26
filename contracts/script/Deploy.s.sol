// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {TreasuryVault} from "../src/TreasuryVault.sol";

/// @notice Deploys a standalone TreasuryVault wired to an EXISTING ObligationRegistry.
/// @dev Reads from the environment:
///        NEXT_PUBLIC_USDC_ADDRESS                - ERC-20 asset (USDC) address
///        NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS - deployed ObligationRegistry
///        PRIVATE_KEY                             - deployer key; becomes owner
///      To deploy a fresh registry + vault pair together, use
///      DeployObligationRegistry.s.sol instead.
///      Run (from /contracts):
///        forge script script/Deploy.s.sol --rpc-url arbitrum_sepolia --broadcast
contract DeployTreasuryVault is Script {
    function run() external returns (TreasuryVault vault) {
        address usdc = vm.envAddress("NEXT_PUBLIC_USDC_ADDRESS");
        address registry = vm.envAddress("NEXT_PUBLIC_OBLIGATION_REGISTRY_ADDRESS");
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address owner = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);
        vault = new TreasuryVault(usdc, owner, registry);
        vm.stopBroadcast();

        console2.log("TreasuryVault deployed:", address(vault));
        console2.log("asset (USDC):", usdc);
        console2.log("obligationRegistry:", registry);
        console2.log("owner:", owner);
    }
}
