# Post-Execution Evidence Record

The post-execution pipeline now has one composition boundary that joins three independently checked facts:

```text
successful receipt
      +
exact ERC-20 lender repayment event
      +
lock-bound realized profit
      =
verified post-execution evidence
```

## Required correlations

- transaction hash must match the observed receipt;
- receipt must be successful and chain-bound;
- repayment event must use the locked loan token;
- repayment sender must be the executor;
- repayment recipient must be the lender;
- repayment amount must equal the locked repayment amount;
- repayment block must not precede the observation block;
- final loan-asset balance must cover repayment;
- realized profit must meet the locked minimum.

The composition layer is observational. It does not sign, broadcast, custody keys, or grant execution authorization.

Current boundary:

```text
EXECUTION_AUTHORIZATION=0
LIVE_SIGNING=false
BROADCAST_ENABLED=false
```
