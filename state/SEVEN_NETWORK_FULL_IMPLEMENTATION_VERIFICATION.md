# Seven-Network Full Implementation Verification

The repository now provides `scripts/verify-seven-network-full.sh`.

## What it does

For each canonical network it:

1. forks the real configured RPC into a local Anvil instance;
2. verifies the inherited chain ID;
3. reads the current block and gas price;
4. exercises balance/code/call/gas-estimation paths with `cast`;
5. runs the repository read-only RPC smoke matrix against that local fork;
6. verifies the locked execution state.

After all seven forks are validated, it runs the shared Foundry, bot and dashboard build/test suites.

## Matrix

| Network | Chain ID | Anvil |
|---|---:|---:|
| Ethereum | 1 | 18545 |
| BNB Chain | 56 | 18546 |
| Base | 8453 | 18547 |
| Arbitrum One | 42161 | 18548 |
| Avalanche C-Chain | 43114 | 18549 |
| Cronos | 25 | 18550 |
| Sonic | 146 | 18551 |

## Run

From the repository root:

```bash
source .env
chmod +x scripts/verify-seven-network-full.sh
./scripts/verify-seven-network-full.sh
```

The script requires `anvil`, `cast`, `forge`, `node` and `npm`.

The real RPC is used only as the fork source. The validation calls are made against localhost Anvil endpoints. No private key is required, and the script never signs or broadcasts.

## Interpretation

This proves RPC transport, fork creation, chain identity, basic JSON-RPC/cast compatibility, locked-state enforcement and the repository's deterministic test suites.

It does **not** prove that a profitable live arbitrage exists, that a particular DEX route is executable on every network, or that a live transaction should be broadcast.

The separate Ethereum Aave fork test remains the deeper route/callback simulation gate.
