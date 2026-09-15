// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Deterministic accounting helpers for atomic multi-leg routes.
library RouteAccounting {
    error OutputBelowMinimum();
    error InvalidBalanceDelta();
    error InsufficientRepayment();
    error ProfitBelowMinimum();

    /// @notice Resolves the amount for a leg from the verified previous-leg balance delta.
    /// @dev A caller must supply balances observed immediately before and after the leg.
    function previousLegOutput(
        uint256 balanceBefore,
        uint256 balanceAfter,
        uint256 minimumAmountOut
    ) internal pure returns (uint256 amountOut) {
        if (balanceAfter < balanceBefore) revert InvalidBalanceDelta();
        amountOut = balanceAfter - balanceBefore;
        if (amountOut < minimumAmountOut) revert OutputBelowMinimum();
    }

    function requiredRepayment(uint256 principal, uint256 premium) internal pure returns (uint256) {
        return principal + premium;
    }

    /// @notice Checks final asset balance against repayment and hard minimum profit.
    function verifyFinalBalance(
        uint256 finalBalance,
        uint256 principal,
        uint256 premium,
        uint256 minimumProfit
    ) internal pure returns (uint256 profit) {
        uint256 repayment = requiredRepayment(principal, premium);
        if (finalBalance < repayment) revert InsufficientRepayment();
        profit = finalBalance - repayment;
        if (profit < minimumProfit) revert ProfitBelowMinimum();
    }
}
