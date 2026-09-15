// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

library SwapAmountResolver {
    enum Kind { FIXED, PREVIOUS_LEG_OUTPUT }

    struct Source {
        Kind kind;
        uint256 fixedAmount;
    }

    error InvalidFixedAmount();
    error PreviousLegUnavailable();

    function resolve(Source memory source, uint256 previousLegOutput) internal pure returns (uint256) {
        if (source.kind == Kind.FIXED) {
            if (source.fixedAmount == 0) revert InvalidFixedAmount();
            return source.fixedAmount;
        }
        if (previousLegOutput == 0) revert PreviousLegUnavailable();
        return previousLegOutput;
    }
}
