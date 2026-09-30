// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {TreasuryFactory} from "../src/TreasuryFactory.sol";

/// @notice Deploys the public factory used by the treasury onboarding flow.
/// @dev The factory deploys paired vault and obligation-registry instances;
///      each pair is owned by the wallet that calls createTreasury (an EOA or Safe).
contract DeployTreasuryFactory is Script {
    function run() external returns (TreasuryFactory factory) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        factory = new TreasuryFactory();
        vm.stopBroadcast();
        console2.log("TreasuryFactory deployed:", address(factory));
        console2.log("owner calls createTreasury(asset, reserveRequirement)");
    }
}
