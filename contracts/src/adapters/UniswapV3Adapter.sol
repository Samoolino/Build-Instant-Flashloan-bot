// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./IDexAdapter.sol";
import "../FlashLoanInterfaces.sol";

interface ISwapRouterV3Minimal {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut);
}

contract UniswapV3Adapter is IDexAdapter {
    address public immutable executor;
    error UnauthorizedCaller();
    error InvalidAmountOut();

    struct SwapData {
        uint24 fee;
        uint256 deadline;
        uint160 sqrtPriceLimitX96;
    }

    constructor(address executor_) {
        require(executor_ != address(0), "EXECUTOR_ZERO");
        executor = executor_;
    }

    function swap(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minimumAmountOut,
        bytes calldata data
    ) external returns (SwapResult memory result) {
        if (msg.sender != executor) revert UnauthorizedCaller();
        SwapData memory decoded = abi.decode(data, (SwapData));
        require(decoded.deadline >= block.timestamp, "EXPIRED");
        require(IERC20Minimal(tokenIn).transferFrom(executor, address(this), amountIn), "TRANSFER_IN");
        require(IERC20Minimal(tokenIn).approve(router, amountIn), "APPROVE");

        uint256 beforeOut = IERC20Minimal(tokenOut).balanceOf(address(this));
        uint256 quoted = ISwapRouterV3Minimal(router).exactInputSingle(
            ISwapRouterV3Minimal.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: decoded.fee,
                recipient: address(this),
                deadline: decoded.deadline,
                amountIn: amountIn,
                amountOutMinimum: minimumAmountOut,
                sqrtPriceLimitX96: decoded.sqrtPriceLimitX96
            })
        );
        uint256 afterOut = IERC20Minimal(tokenOut).balanceOf(address(this));
        uint256 delta = afterOut - beforeOut;
        if (delta < minimumAmountOut || quoted < minimumAmountOut) revert InvalidAmountOut();
        require(IERC20Minimal(tokenOut).transfer(executor, delta), "TRANSFER_OUT");
        result = SwapResult(delta);
    }
}
