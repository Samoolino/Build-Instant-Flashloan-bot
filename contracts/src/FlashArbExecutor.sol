// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./adapters/IDexAdapter.sol";
import "./registry/IAdapterRegistry.sol";
import "./SwapAmountResolver.sol";
import "./FlashLoanInterfaces.sol";

/// @notice Locked-by-default atomic flash-loan route executor.
/// @dev Designed for fork simulation first. Live signing/broadcasting is external to this contract.
contract FlashArbExecutor is IFlashLoanSimpleReceiverMinimal {
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
    address public activeLender;
    bytes32 public activePlanHash;
    bool private executing;

    error NotOwner();
    error ExecutionDisabled();
    error InvalidPlan();
    error PlanExpired();
    error ChainMismatch();
    error AdapterNotAllowed();
    error RouterNotAllowed();
    error TokenContinuity();
    error InvalidAmountSource();
    error UnauthorizedLender();
    error UnauthorizedInitiator();
    error CallbackPlanMismatch();
    error InsufficientRepayment();
    error InsufficientProfit();
    error InvalidExecutionState();

    event ExecutionEnabledChanged(bool enabled);
    event FlashLoanStarted(bytes32 indexed planHash, address indexed lender, address indexed asset, uint256 amount);
    event SwapExecuted(uint256 indexed leg, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FlashLoanSettled(bytes32 indexed planHash, uint256 repayment, uint256 profit);

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

    /// @notice Starts a lender callback. Intended for controlled fork simulation while the boundary is locked by default.
    function startFlashLoan(address lender, Plan calldata plan) external onlyOwner returns (bytes32 planHash) {
        if (!executionEnabled) revert ExecutionDisabled();
        if (executing || activeLender != address(0)) revert InvalidExecutionState();
        planHash = _validatePlan(plan);
        activeLender = lender;
        activePlanHash = planHash;
        executing = true;
        emit FlashLoanStarted(planHash, lender, plan.asset, plan.loanAmount);
        IAaveV3PoolMinimal(lender).flashLoanSimple(address(this), plan.asset, plan.loanAmount, abi.encode(plan), 0);
        if (activeLender != address(0) || executing) revert InvalidExecutionState();
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool) {
        if (msg.sender != activeLender || activeLender == address(0)) revert UnauthorizedLender();
        if (initiator != address(this)) revert UnauthorizedInitiator();

        Plan memory plan = abi.decode(params, (Plan));
        bytes32 planHash = _validatePlan(plan);
        if (planHash != activePlanHash || asset != plan.asset || amount != plan.loanAmount) revert CallbackPlanMismatch();

        uint256 previousLegOutput;
        address currentToken = asset;
        for (uint256 i = 0; i < plan.swaps.length; ++i) {
            Swap memory swap = plan.swaps[i];
            if (swap.tokenIn != currentToken) revert TokenContinuity();

            uint256 amountIn = SwapAmountResolver.Source({kind: swap.amountSource, fixedAmount: swap.amountIn}).resolve(previousLegOutput);
            uint256 beforeOut = IERC20Minimal(swap.tokenOut).balanceOf(address(this));
            require(IERC20Minimal(swap.tokenIn).approve(swap.adapter, amountIn), "APPROVE_ADAPTER");
            IDexAdapter.SwapResult memory result = IDexAdapter(swap.adapter).swap(
                swap.router,
                swap.tokenIn,
                swap.tokenOut,
                amountIn,
                swap.minimumAmountOut,
                swap.data
            );
            uint256 afterOut = IERC20Minimal(swap.tokenOut).balanceOf(address(this));
            uint256 observedDelta = afterOut - beforeOut;
            if (observedDelta < swap.minimumAmountOut || result.amountOut != observedDelta) revert InvalidPlan();
            previousLegOutput = observedDelta;
            currentToken = swap.tokenOut;
            emit SwapExecuted(i, swap.tokenIn, swap.tokenOut, amountIn, observedDelta);
        }

        if (currentToken != asset) revert TokenContinuity();
        uint256 repayment = amount + premium;
        uint256 finalBalance = IERC20Minimal(asset).balanceOf(address(this));
        if (finalBalance < repayment) revert InsufficientRepayment();
        uint256 profit = finalBalance - repayment;
        if (profit < plan.minimumProfit) revert InsufficientProfit();

        if (profit != 0) require(IERC20Minimal(asset).transfer(plan.profitRecipient, profit), "PROFIT_TRANSFER");
        require(IERC20Minimal(asset).approve(msg.sender, repayment), "APPROVE_LENDER");
        emit FlashLoanSettled(planHash, repayment, profit);
        activeLender = address(0);
        activePlanHash = bytes32(0);
        executing = false;
        return true;
    }

    function validatePlan(Plan calldata plan) external view returns (bytes32 planHash) {
        return _validatePlan(plan);
    }

    function _validatePlan(Plan memory plan) internal view returns (bytes32 planHash) {
        if (plan.chainId != block.chainid || plan.chainId != deploymentChainId) revert ChainMismatch();
        if (plan.asset == address(0) || plan.loanAmount == 0 || plan.profitRecipient == address(0)) revert InvalidPlan();
        if (plan.expiry < block.timestamp) revert PlanExpired();
        if (plan.swaps.length == 0 || plan.swaps.length > 8) revert InvalidPlan();

        address currentToken = plan.asset;
        for (uint256 i = 0; i < plan.swaps.length; ++i) {
            Swap memory swap = plan.swaps[i];
            if (swap.adapter == address(0) || swap.router == address(0) || swap.tokenIn == address(0) || swap.tokenOut == address(0)) revert InvalidPlan();
            if (swap.tokenIn != currentToken) revert TokenContinuity();
            if (!registry.isAdapterAllowed(swap.adapter)) revert AdapterNotAllowed();
            if (!registry.isRouterAllowed(swap.adapter, swap.router)) revert RouterNotAllowed();
            if (swap.amountSource == SwapAmountResolver.Kind.FIXED && swap.amountIn == 0) revert InvalidAmountSource();
            if (swap.amountSource == SwapAmountResolver.Kind.PREVIOUS_LEG_OUTPUT && i == 0) revert InvalidAmountSource();
            currentToken = swap.tokenOut;
        }
        if (currentToken != plan.asset) revert TokenContinuity();
        planHash = hashPlan(plan);
    }

    function hashPlan(Plan memory plan) public pure returns (bytes32) {
        bytes32[] memory swapHashes = new bytes32[](plan.swaps.length);
        for (uint256 i = 0; i < plan.swaps.length; ++i) {
            Swap memory s = plan.swaps[i];
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
