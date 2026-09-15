// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./adapters/IDexAdapter.sol";
import "./registry/IAdapterRegistry.sol";
import "./SwapAmountResolver.sol";

/// @notice Execution-boundary and canonical-plan validation core.
/// @dev The default deployment is locked. No arbitrary router call path exists.
contract FlashArbExecutor {
    using SwapAmountResolver for SwapAmountResolver.Source;

    struct Swap {
        address adapter;
        address router;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minimumAmountOut;
        bytes data;
        SwapAmountResolver.Kind amountSource;
    }

    struct Plan {
        uint256 chainId;
        address asset;
        uint256 loanAmount;
        uint256 minimumProfit;
        uint256 expiry;
        address profitRecipient;
        Swap[] swaps;
    }

    address public immutable owner;
    IAdapterRegistry public immutable registry;
    bool public executionEnabled;
    uint256 public immutable deploymentChainId;

    error NotOwner();
    error ExecutionDisabled();
    error InvalidPlan();
    error PlanExpired();
    error ChainMismatch();
    error AdapterNotAllowed();
    error RouterNotAllowed();
    error TokenContinuity();
    error InvalidAmountSource();

    event ExecutionEnabledChanged(bool enabled);

    constructor(address owner_, address registry_) {
        if (owner_ == address(0) || registry_ == address(0)) revert InvalidPlan();
        owner = owner_;
        registry = IAdapterRegistry(registry_);
        deploymentChainId = block.chainid;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setExecutionEnabled(bool enabled) external onlyOwner {
        executionEnabled = enabled;
        emit ExecutionEnabledChanged(enabled);
    }

    function executionGuard() external view returns (bool) {
        if (!executionEnabled) revert ExecutionDisabled();
        return true;
    }

    function validatePlan(Plan calldata plan) external view returns (bytes32 planHash) {
        if (plan.chainId != block.chainid || plan.chainId != deploymentChainId) revert ChainMismatch();
        if (plan.asset == address(0) || plan.loanAmount == 0 || plan.profitRecipient == address(0)) revert InvalidPlan();
        if (plan.expiry < block.timestamp) revert PlanExpired();
        if (plan.swaps.length == 0 || plan.swaps.length > 8) revert InvalidPlan();

        address currentToken = plan.asset;
        for (uint256 i = 0; i < plan.swaps.length; ++i) {
            Swap calldata swap = plan.swaps[i];
            if (swap.adapter == address(0) || swap.router == address(0) || swap.tokenIn == address(0) || swap.tokenOut == address(0)) revert InvalidPlan();
            if (swap.tokenIn != currentToken) revert TokenContinuity();
            if (!registry.isAdapterAllowed(swap.adapter)) revert AdapterNotAllowed();
            if (!registry.isRouterAllowed(swap.adapter, swap.router)) revert RouterNotAllowed();
            if (swap.amountSource == SwapAmountResolver.Kind.FIXED && swap.amountIn == 0) revert InvalidAmountSource();
            if (swap.amountSource == SwapAmountResolver.Kind.PREVIOUS_LEG_OUTPUT && i == 0) revert InvalidAmountSource();
            currentToken = swap.tokenOut;
        }

        planHash = hashPlan(plan);
    }

    function hashPlan(Plan calldata plan) public pure returns (bytes32) {
        bytes32[] memory swapHashes = new bytes32[](plan.swaps.length);
        for (uint256 i = 0; i < plan.swaps.length; ++i) {
            Swap calldata s = plan.swaps[i];
            swapHashes[i] = keccak256(abi.encode(
                s.adapter,
                s.router,
                s.tokenIn,
                s.tokenOut,
                s.amountIn,
                s.minimumAmountOut,
                keccak256(s.data),
                uint8(s.amountSource)
            ));
        }
        return keccak256(abi.encode(
            plan.chainId,
            plan.asset,
            plan.loanAmount,
            plan.minimumProfit,
            plan.expiry,
            plan.profitRecipient,
            keccak256(abi.encodePacked(swapHashes))
        ));
    }
}
