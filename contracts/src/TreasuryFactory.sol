// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TreasuryVault} from "./TreasuryVault.sol";
import {ObligationRegistry} from "./ObligationRegistry.sol";
import {MockStrategy} from "./MockStrategy.sol";
import {AaveV3UsdcStrategy} from "./AaveV3UsdcStrategy.sol";

/// @title TreasuryFactory
/// @notice Creates atomically wired vault/registry pairs and indexes them by owner.
/// @dev The factory temporarily owns each pair while it completes one-time wiring,
///      then transfers both contracts to msg.sender. Calling from a Safe makes the
///      Safe the owner, so its own threshold policy governs treasury actions.
contract TreasuryFactory {
    /// @notice Official Aave V3 Arbitrum Sepolia USDC reserve underlying.
    address public constant AAVE_SEPOLIA_USDC = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    mapping(address owner => address[] vaults) private _vaultsByOwner;
    mapping(address vault => address registry) public registryForVault;
    mapping(address vault => address strategy) public strategyForVault;

    event TreasuryCreated(
        address indexed owner,
        address indexed vault,
        address indexed registry,
        address strategy,
        address asset,
        uint256 reserveRequirement
    );

    function createTreasury(address asset, uint256 reserveRequirement)
        external
        returns (address vaultAddress, address registryAddress, address strategyAddress)
    {
        require(asset != address(0) && asset.code.length > 0, "TreasuryFactory: invalid asset");

        TreasuryVault vault = new TreasuryVault(asset, address(this), address(0));
        ObligationRegistry registry = new ObligationRegistry(address(this), reserveRequirement, address(vault));
        address strategyAddress_;
        if (block.chainid == 421614 && asset == AAVE_SEPOLIA_USDC) {
            strategyAddress_ = address(new AaveV3UsdcStrategy(address(vault)));
        } else {
            strategyAddress_ = address(new MockStrategy(address(vault), asset));
        }
        vault.setObligationRegistry(address(registry));
        // The factory-created strategy is trusted from birth; the owner can
        // authorize replacements or revoke via the vault at any time.
        vault.authorizeStrategy(strategyAddress_);

        vault.transferOwnership(msg.sender);
        registry.transferOwnership(msg.sender);

        vaultAddress = address(vault);
        registryAddress = address(registry);
        strategyAddress = strategyAddress_;
        _vaultsByOwner[msg.sender].push(vaultAddress);
        registryForVault[vaultAddress] = registryAddress;
        strategyForVault[vaultAddress] = strategyAddress;

        emit TreasuryCreated(msg.sender, vaultAddress, registryAddress, strategyAddress, asset, reserveRequirement);
    }

    function getTreasuries(address owner) external view returns (address[] memory) {
        return _vaultsByOwner[owner];
    }
}
