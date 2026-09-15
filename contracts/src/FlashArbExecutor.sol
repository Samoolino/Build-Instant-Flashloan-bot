// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Minimal execution-boundary scaffold. It is intentionally locked and does not
/// perform arbitrary router calls or flash-loan broadcasts by itself.
contract FlashArbExecutor {
    address public immutable owner;
    bool public executionEnabled;

    error NotOwner();
    error ExecutionDisabled();

    event ExecutionEnabledChanged(bool enabled);

    constructor(address owner_) {
        if (owner_ == address(0)) revert NotOwner();
        owner = owner_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @dev Remains false in the remote scaffold. Enabling this does not create a
    /// production route; it only establishes the future authorization boundary.
    function setExecutionEnabled(bool enabled) external onlyOwner {
        executionEnabled = enabled;
        emit ExecutionEnabledChanged(enabled);
    }

    function executionGuard() external view returns (bool) {
        if (!executionEnabled) revert ExecutionDisabled();
        return true;
    }
}
