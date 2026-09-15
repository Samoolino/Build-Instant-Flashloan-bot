// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IDexAdapter {
    struct SwapResult {
        uint256 amountOut;
    }

    function swap(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minimumAmountOut,
        bytes calldata data
    ) external returns (SwapResult memory result);
}
