// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./IDexAdapter.sol";
import "../FlashLoanInterfaces.sol";

interface ISushiV2RouterMinimal {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract SushiV2Adapter is IDexAdapter {
    address public immutable executor;
    error UnauthorizedCaller();
    error InvalidPath();

    struct SwapData {
        address[] path;
        uint256 deadline;
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
        if (decoded.path.length < 2 || decoded.path[0] != tokenIn || decoded.path[decoded.path.length - 1] != tokenOut) revert InvalidPath();

        require(IERC20Minimal(tokenIn).transferFrom(msg.sender, address(this), amountIn), "TRANSFER_IN");
        require(IERC20Minimal(tokenIn).approve(router, amountIn), "APPROVE");
        uint256 beforeOut = IERC20Minimal(tokenOut).balanceOf(address(this));
        ISushiV2RouterMinimal(router).swapExactTokensForTokens(
            amountIn,
            minimumAmountOut,
            decoded.path,
            address(this),
            decoded.deadline
        );
        uint256 afterOut = IERC20Minimal(tokenOut).balanceOf(address(this));
        uint256 delta = afterOut - beforeOut;
        if (delta < minimumAmountOut) revert("MIN_OUT");
        require(IERC20Minimal(tokenOut).transfer(executor, delta), "TRANSFER_OUT");
        result = SwapResult(delta);
    }
}
