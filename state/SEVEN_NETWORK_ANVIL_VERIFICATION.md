# Seven-Network Anvil Verification

This is the local-fork verification path for all currently implemented networks.

## Network matrix

| Network | Chain ID | Real RPC variable | Anvil port |
|---|---:|---|---:|
| Ethereum | 1 | ETH_RPC_URL | 18545 |
| BNB Chain | 56 | BSC_RPC_URL | 18546 |
| Base | 8453 | BASE_RPC_URL | 18547 |
| Arbitrum One | 42161 | ARBITRUM_RPC_URL | 18548 |
| Avalanche C-Chain | 43114 | AVAX_RPC_URL | 18549 |
| Cronos | 25 | CRONOS_RPC_URL | 18550 |
| Sonic | 146 | SONIC_RPC_URL | 18551 |

The real RPC is used only as the Anvil fork source. The verification commands interact with localhost Anvil endpoints after the fork is created.

## What this verifies

1. Every configured real RPC is present.
2. Anvil can connect to every real RPC.
3. The fork inherits the expected chain ID.
4. A current fork block can be read.
5. Locked execution-state verification passes.
6. Foundry contract build/tests pass.
7. Bot TypeScript build/tests pass.
8. Dashboard build/tests pass.

This covers the repository's deterministic implementation layers plus the RPC/fork transport boundary.

## Run

From the repository root:

```bash
source .env
chmod +x scripts/verify-seven-network-anvil.sh
./scripts/verify-seven-network-anvil.sh
```

The script starts seven local Anvil instances on ports 18545-18551 and tears them down automatically when verification finishes.

## Important

The current real-RPC matrix previously returned HTTP 401 for all seven endpoints. Until authenticated RPC credentials are corrected, the script will fail at the corresponding Anvil fork startup rather than falsely reporting network readiness.

No private key is required by this verification path. It does not sign or broadcast transactions.
