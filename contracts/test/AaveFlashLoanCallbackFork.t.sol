// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface Vm {
    function envOr(string calldata key, string calldata defaultValue) external returns (string memory value);
    function createSelectFork(string calldata rpcUrl) external returns (uint256 forkId);
    function deal(address token, address to, uint256 give) external;
}

interface IERC20Minimal {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPoolMinimal {
    function flashLoanSimple(address receiverAddress,address asset,uint256 amount,bytes calldata params,uint16 referralCode) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(address asset,uint256 amount,uint256 premium,address initiator,bytes calldata params) external returns (bool);
}

/// @notice Fork-only callback integration test for the Ethereum Aave V3 pool.
/// It is skipped unless ETH_RPC_URL is supplied and never broadcasts a transaction.
contract AaveFlashLoanCallbackForkTest is IFlashLoanSimpleReceiver {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address internal constant AAVE_V3_POOL = 0x87870bcA3f3fD6335C3F4ce8392D69350B4fA4E2;
    address internal constant WETH = 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2;

    bool internal callbackSeen;
    address internal callbackAsset;
    uint256 internal callbackAmount;
    uint256 internal callbackPremium;
    address internal callbackInitiator;

    function testEthereumForkAaveFlashLoanCallback() public {
        string memory rpc = vm.envOr("ETH_RPC_URL", "");
        if (bytes(rpc).length == 0) return;

        vm.createSelectFork(rpc);
        vm.deal(WETH, address(this), 11 ether);

        IPoolMinimal(AAVE_V3_POOL).flashLoanSimple(address(this), WETH, 10 ether, bytes("fork-callback"), 0);

        require(callbackSeen, "Aave callback not observed");
        require(callbackAsset == WETH, "unexpected callback asset");
        require(callbackAmount == 10 ether, "unexpected callback amount");
        require(callbackInitiator == address(this), "unexpected callback initiator");
        require(callbackPremium > 0, "premium not observed");
        require(IERC20Minimal(WETH).balanceOf(address(this)) <= 11 ether, "unexpected WETH balance");
    }

    function executeOperation(address asset,uint256 amount,uint256 premium,address initiator,bytes calldata) external returns (bool) {
        require(msg.sender == AAVE_V3_POOL, "unauthorized lender callback");
        require(initiator == address(this), "unauthorized initiator");
        require(asset == WETH, "unexpected asset");
        require(amount == 10 ether, "unexpected amount");

        callbackSeen = true;
        callbackAsset = asset;
        callbackAmount = amount;
        callbackPremium = premium;
        callbackInitiator = initiator;
        IERC20Minimal(asset).approve(AAVE_V3_POOL, amount + premium);
        return true;
    }
}
