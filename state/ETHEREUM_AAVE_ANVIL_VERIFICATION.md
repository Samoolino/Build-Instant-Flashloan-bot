# Ethereum Aave Anvil Verification

This gate connects the real Ethereum RPC to a local Anvil fork, validates the local chain, then runs the existing Aave V3 callback and two-leg executor fork tests against the local fork endpoint.

## Run

```bash
cd ~/Build-Instant-Flashloan-bot
export ALCHEMY_API_KEY="<YOUR_REAL_ALCHEMY_KEY>"
source scripts/alchemy-rpc-env.sh
chmod +x scripts/verify-ethereum-aave-anvil.sh
./scripts/verify-ethereum-aave-anvil.sh
```

The script is read-only with respect to the upstream RPC. Anvil is local; the Foundry tests use the local fork endpoint. No private key, signing or mainnet broadcast is used.

## Evidence

- local chain ID must be `1`;
- local block number must be readable;
- repository RPC smoke must pass;
- locked execution state must remain enforced;
- Aave V3 callback test must observe the real pool callback and premium;
- two-leg executor test must complete repayment and assert the configured fork profit path;
- live signing and broadcast remain disabled.

This does not establish a live profitable opportunity or authorize a transaction.