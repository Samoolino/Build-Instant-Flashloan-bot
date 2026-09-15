// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/FlashArbExecutor.sol";
import "../src/registry/AdapterRegistry.sol";

contract FlashArbExecutorTest {
    FlashArbExecutor executor;
    AdapterRegistry registry;

    function setUp() public {
        registry = new AdapterRegistry(address(this));
        executor = new FlashArbExecutor(address(this), address(registry));
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

    function testCanonicalPlanAndAllowlists() public {
        setUp();
        address adapter = address(0x1001);
        address router = address(0x2002);
        address tokenA = address(0x3003);

        registry.setAdapter(adapter, true);
        registry.setRouter(adapter, router, true);

        // A valid atomic route must return to the borrowed asset.
        FlashArbExecutor.Swap[] memory swaps = new FlashArbExecutor.Swap[](1);
        swaps[0] = FlashArbExecutor.Swap({
            adapter: adapter,
            router: router,
            tokenIn: tokenA,
            tokenOut: tokenA,
            amountIn: 1 ether,
            minimumAmountOut: 1,
            data: hex"1234",
            amountSource: SwapAmountResolver.Kind.FIXED
        });

        FlashArbExecutor.Plan memory plan = FlashArbExecutor.Plan({
            chainId: block.chainid,
            asset: tokenA,
            loanAmount: 1 ether,
            minimumProfit: 1,
            expiry: block.timestamp + 1 hours,
            profitRecipient: address(this),
            swaps: swaps
        });

        bytes32 h = executor.validatePlan(plan);
        require(h == executor.hashPlan(plan), "hash mismatch");
    }
}
