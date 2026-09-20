# RPC Test Assurance

The current bot unit tests use in-memory RpcTransport implementations. They validate request construction, parsing, and control flow, but they do not prove that a network request reached a provider.

The required read-only RPC probe is now implemented in scripts/rpc-smoke.mjs. It checks the methods exercised by the current built path: eth_chainId, net_version, eth_blockNumber, eth_getBlockByNumber, eth_getBlockByHash, eth_gasPrice, eth_getBalance, eth_getCode, eth_call, eth_estimateGas, eth_getTransactionByHash, and eth_getTransactionReceipt.

The transaction and receipt probes use a zero transaction hash and require null responses. This validates endpoint support without signing or broadcasting anything.

Evidence classes:
- unit RPC tests: mocked transport only
- local Anvil smoke: local JSON-RPC only
- Anvil fork smoke with ANVIL_FORK_URL: local Anvil backed by the supplied upstream endpoint
- multi-network RPC smoke workflow: direct read-only requests to configured provider URLs
- Foundry fork tests with ETH_RPC_URL: upstream Ethereum state read through a fork

No test in this layer signs or broadcasts a transaction.
