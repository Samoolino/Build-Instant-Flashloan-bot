// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../src/FlashArbExecutor.sol";
import "../src/adapters/SushiV2Adapter.sol";
import "../src/registry/AdapterRegistry.sol";

interface VmFork {
    function envOr(string calldata key, string calldata defaultValue) external returns (string memory value);
    function createSelectFork(string calldata rpcUrl) external returns (uint256 forkId);
    function deal(address token, address to, uint256 give) external;
}

interface IERC20Fork {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IAavePoolFork {
    function flashLoanSimple(address receiverAddress,address asset,uint256 amount,bytes calldata params,uint16 referralCode) external;
}

interface IMintableToken {
    function mint(address to, uint256 amount) external;
    function burnFrom(address from, uint256 amount) external;
}

interface ISushiMockRouter {
    function swapExactTokensForTokens(uint256 amountIn,uint256 amountOutMin,address[] calldata path,address to,uint256 deadline) external returns (uint256[] memory amounts);
}

contract ForkRouteToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory name_, string memory symbol_) { name = name_; symbol = symbol_; }
    function approve(address spender, uint256 amount) external returns (bool) { allowance[msg.sender][spender] = amount; return true; }
    function transfer(address to, uint256 amount) external returns (bool) { require(balanceOf[msg.sender] >= amount, "BAL"); balanceOf[msg.sender] -= amount; balanceOf[to] += amount; return true; }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) { require(balanceOf[from] >= amount, "BAL"); uint256 a = allowance[from][msg.sender]; require(a >= amount, "ALLOW"); allowance[from][msg.sender] = a - amount; balanceOf[from] -= amount; balanceOf[to] += amount; return true; }
    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }
    function burnFrom(address from, uint256 amount) external { require(balanceOf[from] >= amount, "BAL"); balanceOf[from] -= amount; }
}

/// @notice Executes the complete executor -> Aave callback -> two adapter legs -> repayment path on an Ethereum fork.
/// The swap venue is deliberately deterministic/mocked; this proves the atomic executor mechanics against the real Aave pool without depending on a stale DEX quote.
contract AaveFlashArbExecutorForkTest {
    VmFork internal constant vm = VmFork(address(uint160(uint256(keccak256("hevm cheat code")))));
    address internal constant AAVE_V3_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    function testEthereumForkTwoLegAtomicExecutor() public {
        string memory rpc = vm.envOr("ETH_RPC_URL", "");
        if (bytes(rpc).length == 0) return;
        vm.createSelectFork(rpc);

        AdapterRegistry registry = new AdapterRegistry(address(this));
        FlashArbExecutor executor = new FlashArbExecutor(address(this), address(registry));
        SushiV2Adapter adapter = new SushiV2Adapter(address(executor));
        ForkRouteToken mid = new ForkRouteToken("Fork Route Token", "FRT");
        DeterministicRouter router = new DeterministicRouter(WETH, address(mid));

        registry.setAdapter(address(adapter), true);
        registry.setRouter(address(adapter), address(router), true);

        executor.setExecutionEnabled(true);
        uint256 loanAmount = 10 ether;
        uint256 premiumBuffer = 20e15;
        uint256 expectedProfit = 2e15;
        uint256 minimumProfit = 1e15;
        uint256 deterministicSecondLegProfit = expectedProfit + premiumBuffer;
        router.setSecondLegProfit(deterministicSecondLegProfit);
        // Fund the deterministic fork router with the extra WETH it must return on leg two.
        vm.deal(WETH, address(router), deterministicSecondLegProfit);

        FlashArbExecutor.Swap[] memory swaps = new FlashArbExecutor.Swap[](2);
        address[] memory path1 = new address[](2);
        path1[0] = WETH; path1[1] = address(mid);
        address[] memory path2 = new address[](2);
        path2[0] = address(mid); path2[1] = WETH;
        uint256 deadline = block.timestamp + 300;
        swaps[0] = FlashArbExecutor.Swap({
            adapter: address(adapter), router: address(router), tokenIn: WETH, tokenOut: address(mid),
            amountIn: loanAmount, minimumAmountOut: loanAmount, data: abi.encode(path1, deadline),
            amountSource: SwapAmountResolver.Kind.FIXED
        });
        swaps[1] = FlashArbExecutor.Swap({
            adapter: address(adapter), router: address(router), tokenIn: address(mid), tokenOut: WETH,
            amountIn: 0, minimumAmountOut: loanAmount, data: abi.encode(path2, deadline),
            amountSource: SwapAmountResolver.Kind.PREVIOUS_LEG_OUTPUT
        });

        FlashArbExecutor.Plan memory plan = FlashArbExecutor.Plan({
            chainId: block.chainid, asset: WETH, loanAmount: loanAmount, minimumProfit: minimumProfit,
            expiry: deadline, profitRecipient: address(this), swaps: swaps
        });

        uint256 before = IERC20Fork(WETH).balanceOf(address(this));
        executor.startFlashLoan(AAVE_V3_POOL, plan);
        uint256 afterBalance = IERC20Fork(WETH).balanceOf(address(this));
        _assertForkExecution(executor, address(this), WETH, before, afterBalance, minimumProfit);
    }

    function _assertForkExecution(
        FlashArbExecutor executor,
        address recipient,
        address asset,
        uint256 beforeBalance,
        uint256 afterBalance,
        uint256 minimumProfit
    ) internal view {
        require(afterBalance >= beforeBalance + minimumProfit, "NET_PROFIT_NOT_REALIZED");
        require(IERC20Fork(asset).balanceOf(recipient) == afterBalance, "BALANCE_READ_MISMATCH");
        require(executor.activeLender() == address(0), "ACTIVE_LENDER_NOT_CLEARED");
        require(executor.activePlanHash() == bytes32(0), "PLAN_HASH_NOT_CLEARED");
    }
    }
}

contract DeterministicRouter is ISushiMockRouter {
    address public immutable weth;
    ForkRouteToken public immutable mid;
    uint256 public secondLegProfit;

    constructor(address weth_, address mid_) { weth = weth_; mid = ForkRouteToken(mid_); }
    function setSecondLegProfit(uint256 amount) external { secondLegProfit = amount; }

    function swapExactTokensForTokens(uint256 amountIn,uint256 amountOutMin,address[] calldata path,address to,uint256 deadline) external returns (uint256[] memory amounts) {
        require(block.timestamp <= deadline, "EXPIRED");
        require(path.length == 2, "PATH");
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        if (path[0] == weth && path[1] == address(mid)) {
            require(amountOutMin <= amountIn, "MIN");
            require(IERC20Fork(weth).approve(address(this), 0), "NOOP");
            (bool ok,) = weth.call(abi.encodeWithSignature("transferFrom(address,address,uint256)", msg.sender, address(this), amountIn));
            require(ok, "WETH_IN");
            mid.mint(to, amountIn);
            amounts[1] = amountIn;
        } else if (path[0] == address(mid) && path[1] == weth) {
            require(secondLegProfit > 0, "RATE_NOT_SET");
            mid.burnFrom(msg.sender, amountIn);
            uint256 out = amountIn + secondLegProfit;
            require(out >= amountOutMin, "MIN");
            (bool ok,) = weth.call(abi.encodeWithSignature("transfer(address,uint256)", to, out));
            require(ok, "WETH_OUT");
            amounts[1] = out;
        } else { revert("TOKEN_PATH"); }
    }
}
