// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/FlashArbExecutor.sol";

contract FlashArbExecutorTest {
    FlashArbExecutor executor;

    function setUp() public {
        executor = new FlashArbExecutor(address(this));
    }

    function testStartsDisabled() public {
        setUp();
        require(!executor.executionEnabled(), "must start disabled");
    }

    function testOwnerCanToggleBoundary() public {
        setUp();
        executor.setExecutionEnabled(true);
        require(executor.executionEnabled(), "must enable");
        executor.setExecutionEnabled(false);
        require(!executor.executionEnabled(), "must disable");
    }
}
