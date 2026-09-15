// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/FlashArbExecutor.sol";

contract FlashArbExecutorTest is Test {
    FlashArbExecutor executor;

    function setUp() public {
        executor = new FlashArbExecutor(address(this));
    }

    function testStartsDisabled() public view {
        assertFalse(executor.executionEnabled());
    }

    function testOwnerCanToggleBoundary() public {
        executor.setExecutionEnabled(true);
        assertTrue(executor.executionEnabled());
        executor.setExecutionEnabled(false);
        assertFalse(executor.executionEnabled());
    }
}
