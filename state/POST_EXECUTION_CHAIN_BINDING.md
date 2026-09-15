# Post-Execution Chain Binding

The receipt verifier now resolves `eth_chainId` before accepting a receipt and requires it to equal the chain ID captured in the execution-lock record.

```text
execution lock chainId
        ↓
eth_chainId
        ↓
exact match required
        ↓
receipt verification
```

A receipt from another network is rejected with `RECEIPT_CHAIN_MISMATCH`.

This remains an observational control: no transaction is signed or broadcast by the verifier.
