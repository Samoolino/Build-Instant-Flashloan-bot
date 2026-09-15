// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./IAdapterRegistry.sol";

contract AdapterRegistry is IAdapterRegistry {
    address public immutable owner;
    mapping(address => bool) private adapters;
    mapping(address => mapping(address => bool)) private routers;

    error NotOwner();
    error ZeroAddress();

    constructor(address owner_) {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setAdapter(address adapter, bool allowed) external onlyOwner {
        if (adapter == address(0)) revert ZeroAddress();
        adapters[adapter] = allowed;
    }

    function setRouter(address adapter, address router, bool allowed) external onlyOwner {
        if (adapter == address(0) || router == address(0)) revert ZeroAddress();
        routers[adapter][router] = allowed;
    }

    function isAdapterAllowed(address adapter) external view returns (bool) {
        return adapters[adapter];
    }

    function isRouterAllowed(address adapter, address router) external view returns (bool) {
        return routers[adapter][router];
    }
}
