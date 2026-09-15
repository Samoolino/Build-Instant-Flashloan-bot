# Engagement Observation Identity

The engine now assigns each validated engagement observation a deterministic SHA-256 identity.

## Identity inputs

The identity covers the observed chain block/time, quote and lender source/block identifiers, route economics, loan/repayment amounts, plan hash, simulation result, route legs, and profitability decision.

BigInt values are canonicalized as decimal strings and object keys are sorted before hashing. The resulting identifier has the form:

```text
sha256:<64 lowercase hexadecimal characters>
```

## Purpose

This identity is an audit/reproducibility boundary. A change to observed economics, route structure, plan hash, or profitability data produces a different identity.

It does not authorize execution and does not contain credentials.

## Safety boundary

```text
EXECUTION_AUTHORIZATION=0
LIVE_SIGNING=false
BROADCAST_ENABLED=false
```
