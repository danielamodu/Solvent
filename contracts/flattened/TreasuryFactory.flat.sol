// SPDX-License-Identifier: MIT
pragma solidity >=0.4.16 >=0.6.2 ^0.8.20;

// lib/openzeppelin-contracts/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// src/interfaces/IObligationRegistry.sol

interface IObligationRegistry {
    enum Status { PENDING, FUNDED, SETTLED, CANCELLED, DEFAULTED }
    enum Priority { HIGH, MEDIUM, LOW }

    event ObligationCreated(bytes32 indexed id, address beneficiary, uint256 amount, uint256 dueAt);
    event ObligationCancelled(bytes32 indexed id);
    event ObligationSettled(bytes32 indexed id);

    function createObligation(address beneficiary, uint256 amount, uint256 dueAt, Priority priority) external returns (bytes32 id);
    function cancelObligation(bytes32 id) external;
    function settleObligation(bytes32 id) external;
    function getOutstandingAmount() external view returns (uint256);
    function protectedLiquidity() external view returns (uint256);
}

// src/interfaces/IStrategyAdapter.sol

interface IStrategyAdapter {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function totalValue() external view returns (uint256);
    function availableLiquidity() external view returns (uint256);
    function claimableYield() external view returns (uint256);
    /// @notice Transfers any accrued yield to the vault and returns the amount.
    function harvestYield() external returns (uint256);
}

// src/interfaces/ITreasuryVault.sol

interface ITreasuryVault {
    event Deposited(address indexed depositor, uint256 amount);
    event Withdrawn(address indexed recipient, uint256 amount);
    event StrategyDeployed(address indexed strategy, uint256 amount);
    event StrategyRecalled(address indexed strategy, uint256 amount);

    function deposit(uint256 amount) external;
    function withdraw(uint256 amount, address recipient) external;
    function totalAssets() external view returns (uint256);
    function availableBalance() external view returns (uint256);
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

// lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

// lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/extensions/IERC20Metadata.sol)

/**
 * @dev Interface for the optional metadata functions from the ERC-20 standard.
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}

// lib/openzeppelin-contracts/contracts/access/Ownable.sol

// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC20Metadata.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20Metadata.sol)

// lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// src/ObligationRegistry.sol

/// @title ObligationRegistry
/// @notice Phase 2: the ledger of the treasury's forward commitments and the
///         source of truth for how much liquidity must stay protected. Each
///         obligation reserves capital the vault must not deploy to strategies.
///         Only the owner may create, cancel, or settle obligations.
/// @dev `getOutstandingAmount()` is maintained as a running accumulator instead
///      of being recomputed by iteration: the only PENDING-entering transition
///      is creation (+amount) and the only PENDING-leaving transitions are
///      settle and cancel (-amount), so `_outstandingAmount` is always exactly
///      the sum of every PENDING obligation's amount.
contract ObligationRegistry is IObligationRegistry, Ownable {
    struct Obligation {
        bytes32 id;
        address beneficiary;
        uint256 amount;
        uint256 dueAt;
        IObligationRegistry.Priority priority;
        IObligationRegistry.Status status;
    }

    /// @notice Flat reserve that is always protected, independent of obligations.
    /// @dev Set once at construction; immutable for now (governance-tunable later).
    uint256 public immutable reserveRequirement;

    /// @notice TreasuryVault this registry settles obligations against.
    address public vault;

    /// @notice Obligations keyed by their deterministic id.
    mapping(bytes32 => Obligation) public obligations;

    /// @dev Running sum of all PENDING obligation amounts. See contract notes.
    uint256 private _outstandingAmount;

    /// @dev Monotonic nonce mixed into obligation ids so two identical creates
    ///      (same beneficiary/amount/dueAt in the same block) never collide.
    uint256 private _nonce;

    event VaultConfigured(address indexed vault);

    constructor(address initialOwner, uint256 reserveRequirement_, address vault_) Ownable(initialOwner) {
        reserveRequirement = reserveRequirement_;
        vault = vault_;
    }

    /// @notice One-time vault wiring used by TreasuryFactory during atomic setup.
    function setVault(address vault_) external onlyOwner {
        require(vault == address(0), "ObligationRegistry: vault already set");
        require(vault_ != address(0), "ObligationRegistry: vault is zero address");
        vault = vault_;
        emit VaultConfigured(vault_);
    }

    /// @inheritdoc IObligationRegistry
    function createObligation(address beneficiary, uint256 amount, uint256 dueAt, Priority priority)
        external
        override
        onlyOwner
        returns (bytes32 id)
    {
        require(beneficiary != address(0), "ObligationRegistry: beneficiary is zero address");
        require(amount > 0, "ObligationRegistry: amount is zero");

        id = keccak256(abi.encodePacked(address(this), msg.sender, beneficiary, amount, dueAt, _nonce++));
        require(obligations[id].id == bytes32(0), "ObligationRegistry: obligation exists");

        obligations[id] = Obligation({
            id: id,
            beneficiary: beneficiary,
            amount: amount,
            dueAt: dueAt,
            priority: priority,
            status: Status.PENDING
        });
        _outstandingAmount += amount;

        emit ObligationCreated(id, beneficiary, amount, dueAt);
    }

    /// @inheritdoc IObligationRegistry
    function cancelObligation(bytes32 id) external override onlyOwner {
        Obligation storage o = obligations[id];
        require(o.id == id, "ObligationRegistry: unknown obligation");
        require(o.status == Status.PENDING, "ObligationRegistry: not pending");

        o.status = Status.CANCELLED;
        _outstandingAmount -= o.amount;

        emit ObligationCancelled(id);
    }

    /// @inheritdoc IObligationRegistry
    /// @dev Settlement moves real funds: the vault pays the beneficiary the
    ///      obligation amount. State is updated before the external `withdraw`
    ///      call (checks-effects-interactions) so a re-entrant settle of the same
    ///      id hits the non-PENDING guard, and a vault revert (e.g. insufficient
    ///      available balance) rolls the whole settlement back.
    function settleObligation(bytes32 id) external override onlyOwner {
        require(vault != address(0), "ObligationRegistry: vault not configured");
        Obligation storage o = obligations[id];
        require(o.id == id, "ObligationRegistry: unknown obligation");
        require(o.status == Status.PENDING, "ObligationRegistry: not pending");

        uint256 amount = o.amount;
        address beneficiary = o.beneficiary;

        o.status = Status.SETTLED;
        _outstandingAmount -= amount;

        ITreasuryVault(vault).withdraw(amount, beneficiary);

        emit ObligationSettled(id);
    }

    /// @inheritdoc IObligationRegistry
    function getOutstandingAmount() public view override returns (uint256) {
        return _outstandingAmount;
    }

    /// @inheritdoc IObligationRegistry
    /// @dev Protected liquidity = flat reserve + every outstanding (PENDING) promise.
    function protectedLiquidity() external view override returns (uint256) {
        return reserveRequirement + _outstandingAmount;
    }
}

// lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol

// OpenZeppelin Contracts (last updated v5.7.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeERC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Oppositely, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /// @dev Attempts to fetch the token decimals. A return value of false indicates that the attempt failed in some way.
    function tryGetDecimals(IERC20 token) internal view returns (bool success, uint8 decimals) {
        bytes4 selector = IERC20Metadata.decimals.selector;
        assembly ("memory-safe") {
            mstore(0x00, selector)
            success := staticcall(gas(), token, 0x00, 4, 0x00, 0x20)
            success := and(and(success, gt(returndatasize(), 0x1f)), lt(mload(0x00), 0x100))
            decimals := mul(success, mload(0x00))
        }
    }

    /**
     * @dev Imitates a Solidity `token.transfer(to, value)` call, relaxing the requirement on the return value: the
     * return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransfer(IERC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    /**
     * @dev Imitates a Solidity `token.transferFrom(from, to, value)` call, relaxing the requirement on the return
     * value: the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param from The sender of the tokens
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value,
        bool bubble
    ) private returns (bool success) {
        bytes4 selector = IERC20.transferFrom.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(from, shr(96, not(0))))
            mstore(0x24, and(to, shr(96, not(0))))
            mstore(0x44, value)
            success := call(gas(), token, 0, 0x00, 0x64, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    /**
     * @dev Imitates a Solidity `token.approve(spender, value)` call, relaxing the requirement on the return value:
     * the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param spender The spender of the tokens
     * @param value The amount of token to approve
     * @param bubble Behavior switch if the approve call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeApprove(IERC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}

// src/AaveV3UsdcStrategy.sol

interface IAaveV3Pool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

/// @title AaveV3UsdcStrategy
/// @notice Testnet adapter for the official Aave V3 Arbitrum Sepolia USDC market.
/// @dev Not an audited production vault strategy. The vault is the only caller;
///      aUSDC stays in this adapter and cannot be redirected by a keeper or user.
contract AaveV3UsdcStrategy is IStrategyAdapter {
    using SafeERC20 for IERC20;

    uint256 public constant ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
    address public constant USDC = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    address public constant A_USDC = 0x460b97BD498E1157530AEb3086301d5225b91216;
    IAaveV3Pool public constant POOL = IAaveV3Pool(0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff);

    address public immutable vault;
    IERC20 public immutable asset;
    IERC20 public immutable aToken;
    uint256 public principal;

    modifier onlyVault() {
        require(msg.sender == vault, "AaveStrategy: caller is not vault");
        _;
    }

    constructor(address vault_) {
        require(block.chainid == ARBITRUM_SEPOLIA_CHAIN_ID, "AaveStrategy: wrong chain");
        require(vault_ != address(0), "AaveStrategy: vault is zero address");
        vault = vault_;
        asset = IERC20(USDC);
        aToken = IERC20(A_USDC);
    }

    function deposit(uint256 amount) external override onlyVault {
        asset.safeTransferFrom(vault, address(this), amount);
        asset.forceApprove(address(POOL), amount);
        POOL.supply(address(asset), amount, address(this), 0);
        principal += amount;
    }

    function withdraw(uint256 amount) external override onlyVault {
        require(amount <= principal, "AaveStrategy: exceeds principal");
        principal -= amount;
        uint256 withdrawn = POOL.withdraw(address(asset), amount, vault);
        require(withdrawn == amount, "AaveStrategy: partial withdrawal");
    }

    function totalValue() public view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    function availableLiquidity() public view override returns (uint256) {
        uint256 value = totalValue();
        uint256 cash = asset.balanceOf(address(aToken));
        return value < cash ? value : cash;
    }

    function claimableYield() public view override returns (uint256) {
        uint256 value = totalValue();
        return value > principal ? value - principal : 0;
    }

    function harvestYield() external override onlyVault returns (uint256 amount) {
        amount = claimableYield();
        uint256 liquid = availableLiquidity();
        if (amount > liquid) amount = liquid;
        if (amount != 0) {
            uint256 withdrawn = POOL.withdraw(address(asset), amount, vault);
            require(withdrawn == amount, "AaveStrategy: partial harvest");
        }
    }
}

// src/MockStrategy.sol

/// @title MockStrategy
/// @notice Phase 3: the single hackathon strategy. Custodies USDC pulled from
///         the vault and returns it on withdraw. No yield is simulated —
///         `totalValue()` is pure principal (its live USDC balance).
/// @dev Only the wiring vault may move funds in or out.
contract MockStrategy is IStrategyAdapter {
    using SafeERC20 for IERC20;

    /// @notice The vault permitted to deposit into / withdraw from this strategy.
    address public immutable vault;

    /// @notice The ERC-20 asset managed by this strategy (USDC).
    IERC20 public immutable asset;

    modifier onlyVault() {
        require(msg.sender == vault, "MockStrategy: caller is not the vault");
        _;
    }

    constructor(address vault_, address asset_) {
        require(vault_ != address(0), "MockStrategy: vault is zero address");
        require(asset_ != address(0), "MockStrategy: asset is zero address");
        vault = vault_;
        asset = IERC20(asset_);
    }

    /// @inheritdoc IStrategyAdapter
    /// @dev Pulls `amount` from the vault; the vault must have approved this
    ///      strategy first.
    function deposit(uint256 amount) external override onlyVault {
        asset.safeTransferFrom(msg.sender, address(this), amount);
    }

    /// @inheritdoc IStrategyAdapter
    /// @dev Pushes `amount` back to the vault (the only permitted caller).
    function withdraw(uint256 amount) external override onlyVault {
        asset.safeTransfer(msg.sender, amount);
    }

    /// @inheritdoc IStrategyAdapter
    function totalValue() external view override returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /// @inheritdoc IStrategyAdapter
    function availableLiquidity() external view override returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /// @inheritdoc IStrategyAdapter
    function harvestYield() external view override onlyVault returns (uint256) {
        return 0;
    }

    /// @inheritdoc IStrategyAdapter
    function claimableYield() external pure override returns (uint256) {
        return 0;
    }
}

// src/TreasuryVault.sol

/// @title TreasuryVault
/// @notice Custody of a single ERC-20 (USDC). Deposits are open; withdrawals are
///         owner-only. `totalAssets` is canonical accounting, NOT the raw token
///         balance: capital deployed to a strategy is still owned by the treasury,
///         so `totalAssets` is unchanged by a deploy. The idle (physically held)
///         portion is exposed via `availableBalance = totalAssets - totalDeployed`.
/// @dev    `deployableCapital()` is the core invariant boundary: capital the
///         treasury has already promised (protected liquidity) or already deployed
///         can never be (re)deployed to a strategy.
contract TreasuryVault is ITreasuryVault, Ownable {
    using SafeERC20 for IERC20;

    /// @notice The ERC-20 asset held by this vault (USDC).
    IERC20 public immutable asset;

    /// @notice Registry of outstanding obligations that gates deployable capital.
    address public obligationRegistry;

    /// @notice Principal currently deployed to each strategy adapter.
    mapping(address => uint256) public strategyPositions;

    /// @notice Strategies the owner has approved for deploy/recall/harvest.
    /// @dev A compromised or mistaken strategy address can trap funds or —
    ///      via a lying `harvestYield` — inflate `totalAssets` without backing,
    ///      so every strategy entrypoint requires explicit authorization. The
    ///      factory authorizes the strategy it creates during setup; the owner
    ///      can authorize replacements and revoke anything at any time.
    mapping(address => bool) public authorizedStrategies;

    /// @notice Sum of all strategy positions — principal currently out on deployment.
    uint256 public totalDeployed;

    /// @dev Canonical accounting balance, updated on deposit/withdraw. Unaffected
    ///      by deploy/recall — deployed capital remains treasury-owned.
    uint256 private _totalAssets;

    event ObligationRegistryConfigured(address indexed registry);
    event StrategyYieldHarvested(address indexed strategy, uint256 amount);
    event StrategyAuthorized(address indexed strategy);
    event StrategyRevoked(address indexed strategy);

    constructor(address asset_, address initialOwner, address obligationRegistry_) Ownable(initialOwner) {
        require(asset_ != address(0), "TreasuryVault: asset is zero address");
        asset = IERC20(asset_);
        obligationRegistry = obligationRegistry_;
    }

    /// @notice One-time registry wiring used by TreasuryFactory during atomic setup.
    function setObligationRegistry(address registry_) external onlyOwner {
        require(obligationRegistry == address(0), "TreasuryVault: registry already set");
        require(registry_ != address(0), "TreasuryVault: registry is zero address");
        obligationRegistry = registry_;
        emit ObligationRegistryConfigured(registry_);
    }

    /// @notice Approve a strategy adapter for deploy/recall/harvest.
    function authorizeStrategy(address strategy) external onlyOwner {
        require(strategy != address(0), "TreasuryVault: strategy is zero address");
        authorizedStrategies[strategy] = true;
        emit StrategyAuthorized(strategy);
    }

    /// @notice Remove a strategy adapter's approval. Existing recorded
    ///         positions stay intact and must be recalled via an authorized
    ///         path — revocation stops new flows, it does not move funds.
    function revokeStrategy(address strategy) external onlyOwner {
        authorizedStrategies[strategy] = false;
        emit StrategyRevoked(strategy);
    }

    modifier onlyAuthorizedStrategy(address strategy) {
        require(authorizedStrategies[strategy], "TreasuryVault: strategy not authorized");
        _;
    }

    /// @inheritdoc ITreasuryVault
    function deposit(uint256 amount) external override {
        asset.safeTransferFrom(msg.sender, address(this), amount);
        _totalAssets += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @inheritdoc ITreasuryVault
    /// @dev Bounded by idle balance: deployed capital must be recalled first.
    ///      Callable by the owner (manual withdrawals) or the obligation registry
    ///      (paying a beneficiary on settlement) — the registry is trusted and
    ///      wired in at construction.
    function withdraw(uint256 amount, address recipient) external override {
        require(
            msg.sender == owner() || msg.sender == obligationRegistry,
            "TreasuryVault: not authorized"
        );
        require(amount <= availableBalance(), "TreasuryVault: insufficient balance");
        _totalAssets -= amount;
        asset.safeTransfer(recipient, amount);
        emit Withdrawn(recipient, amount);
    }

    /// @inheritdoc ITreasuryVault
    /// @dev Tracks deposits/withdrawals only; excludes unrealised strategy gains (MVP).
    function totalAssets() public view override returns (uint256) {
        return _totalAssets;
    }

    /// @inheritdoc ITreasuryVault
    /// @notice Idle USDC physically in the vault: total assets minus what's deployed.
    function availableBalance() public view override returns (uint256) {
        return _totalAssets - totalDeployed;
    }

    /// @notice Capital free to deploy after protected liquidity and existing
    ///         deployments: deployable = totalAssets - protectedLiquidity - totalDeployed.
    function deployableCapital() public view returns (uint256) {
        require(obligationRegistry != address(0), "TreasuryVault: registry not configured");
        uint256 protected = IObligationRegistry(obligationRegistry).protectedLiquidity();
        if (protected >= _totalAssets) {
            return 0;
        }
        uint256 unprotected = _totalAssets - protected;
        if (totalDeployed >= unprotected) {
            return 0;
        }
        return unprotected - totalDeployed;
    }

    /// @notice Deploy idle capital to a strategy adapter, enforcing the core
    ///         invariant that promised or already-deployed capital is never used.
    /// @dev Assets remain treasury-owned; only `strategyPositions`/`totalDeployed`
    ///      move. Effects precede the external adapter call (checks-effects-interactions).
    function deployToStrategy(address strategy, uint256 amount) external onlyOwner onlyAuthorizedStrategy(strategy) {
        require(strategy != address(0), "TreasuryVault: strategy is zero address");
        require(amount <= deployableCapital(), "Insufficient deployable capital");

        strategyPositions[strategy] += amount;
        totalDeployed += amount;

        asset.forceApprove(strategy, amount);
        IStrategyAdapter(strategy).deposit(amount);

        emit StrategyDeployed(strategy, amount);
    }

    /// @notice Pull deployed capital back from a strategy into the vault.
    /// @dev Restores idle balance; `totalAssets` is unchanged (capital was always
    ///      treasury-owned). Effects precede the external adapter call.
    function recallFromStrategy(address strategy, uint256 amount) external onlyOwner onlyAuthorizedStrategy(strategy) {
        require(strategyPositions[strategy] >= amount, "TreasuryVault: recall exceeds position");

        strategyPositions[strategy] -= amount;
        totalDeployed -= amount;

        IStrategyAdapter(strategy).withdraw(amount);

        emit StrategyRecalled(strategy, amount);
    }

    /// @notice Claim strategy yield into idle vault liquidity without changing
    ///         the strategy's recorded principal position.
    function harvestStrategyYield(address strategy) external onlyOwner onlyAuthorizedStrategy(strategy) returns (uint256 amount) {
        require(strategy != address(0), "TreasuryVault: strategy is zero address");
        amount = IStrategyAdapter(strategy).harvestYield();
        _totalAssets += amount;
        emit StrategyYieldHarvested(strategy, amount);
    }
}

// src/TreasuryFactory.sol

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
