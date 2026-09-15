# Repayment Event Verification

The post-execution assurance path now requires event-level evidence for the lender repayment rather than inferring repayment solely from a successful receipt or final balance.

## Evidence invariant

For an ERC-20 flash-loan asset, the verifier looks for an exact `Transfer(address,address,uint256)` event where:

```text
Token contract = locked loan token
from           = executor
 to            = lender
amount         = locked repayment amount
block          >= observation block
```

This is evidence of the token transfer recorded in the transaction receipt. It is still observational and does not sign or broadcast anything.

## Combined assurance

```text
receipt success
   +
exact repayment Transfer
   +
final loan-asset balance
   +
locked minimum-profit check
   =
post-execution accounting evidence
```

The verifier deliberately does not treat an arbitrary transfer to the lender as repayment: token, sender, recipient, amount, transaction hash, and block context must match the locked execution record.
