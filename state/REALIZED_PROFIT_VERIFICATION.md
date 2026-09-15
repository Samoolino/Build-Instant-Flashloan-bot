# Realized Profit Verification

This layer verifies post-execution economics from externally observed transaction/balance data. It does not sign or broadcast transactions.

## Accounting invariant

```text
realizedProfitTokenUnits = finalAssetBalance - repaymentAmount
```

The result is accepted only when:

```text
finalAssetBalance >= repaymentAmount
realizedProfitTokenUnits >= minimumProfitTokenUnits
loanToken == expectedLoanToken
```

The minimum is taken from the execution-lock record so post-execution verification cannot silently replace the locked economic policy.

## Production evidence boundary

A successful receipt alone is insufficient. A complete post-execution record should correlate:

1. transaction hash and receipt;
2. transaction sender and executor recipient;
3. receipt status;
4. gas used and effective gas price;
5. flash-loan repayment evidence;
6. final loan-asset balance or equivalent transfer accounting;
7. realized profit in token base units;
8. observation ID and plan hash where available.

No private key is stored or handled by this verifier, and no broadcast RPC is called.
