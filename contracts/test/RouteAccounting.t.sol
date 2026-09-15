// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/RouteAccounting.sol";

contract RouteAccountingTest {
    function testPreviousLegOutputUsesBalanceDelta() public pure {
        uint256 out = RouteAccounting.previousLegOutput(100, 175, 70);
        require(out == 75, "delta mismatch");
    }

    function testRequiredRepayment() public pure {
        require(RouteAccounting.requiredRepayment(100, 3) == 103, "repayment mismatch");
    }

    function testFinalBalanceCalculatesNetProfit() public pure {
        uint256 profit = RouteAccounting.verifyFinalBalance(115, 100, 3, 10);
        require(profit == 12, "profit mismatch");
    }

    function testPreviousLegOutputRejectsNegativeDelta() public {
        (bool ok,) = address(this).call(abi.encodeWithSelector(this.callNegativeDelta.selector));
        require(!ok, "negative delta accepted");
    }

    function callNegativeDelta() external pure {
        RouteAccounting.previousLegOutput(175, 100, 1);
    }

    function testFinalBalanceRejectsProfitBelowFloor() public {
        (bool ok,) = address(this).call(abi.encodeWithSelector(this.callLowProfit.selector));
        require(!ok, "low profit accepted");
    }

    function callLowProfit() external pure {
        RouteAccounting.verifyFinalBalance(110, 100, 3, 10);
    }
}
