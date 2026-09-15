import assert from "node:assert/strict";
import test from "node:test";
import { verifyRealizedProfit } from "./realized-profit-verifier.js";
import type { ExecutionLockRecord } from "./engagement-record.js";

const record = {
  observationId: "sha256:" + "a".repeat(64), phase: "EXECUTION_LOCKED", chainId: 1,
  blockNumber: 100n, blockTimestampMs: 1_000_000, lenderPremiumBlockNumber: 100n,
  lenderSourceId: "aave:test", planHash: "0xplan", simulationPassed: true,
  economicInputsVerified: true, netProfitUsd: 5, minimumProfitTokenUnits: 10n,
  decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" }, gasCostUsd: 1,
  loanToken: "0x0000000000000000000000000000000000000001", loanAmount: 1000n,
  repaymentAmount: 1001n, executionAuthorization: 0, liveSigning: false, broadcastEnabled: false,
} as unknown as ExecutionLockRecord;

test("verifies realized profit above the locked minimum", () => {
  const result = verifyRealizedProfit(record, {
    finalAssetBalance: 1025n, repaymentAmount: 1001n, minimumProfitTokenUnits: 10n, expectedLoanToken: record.loanToken,
  });
  assert.equal(result.realizedProfitTokenUnits, 24n);
  assert.equal(result.profitable, true);
});

test("rejects insufficient repayment coverage", () => {
  assert.throws(() => verifyRealizedProfit(record, {
    finalAssetBalance: 1000n, repaymentAmount: 1001n, minimumProfitTokenUnits: 1n, expectedLoanToken: record.loanToken,
  }), /REPAYMENT_NOT_COVERED/);
});

test("rejects realized profit below the locked minimum", () => {
  assert.throws(() => verifyRealizedProfit(record, {
    finalAssetBalance: 1005n, repaymentAmount: 1001n, minimumProfitTokenUnits: 10n, expectedLoanToken: record.loanToken,
  }), /REALIZED_PROFIT_BELOW_MINIMUM/);
});

test("rejects a different loan token", () => {
  assert.throws(() => verifyRealizedProfit(record, {
    finalAssetBalance: 1025n, repaymentAmount: 1001n, minimumProfitTokenUnits: 10n,
    expectedLoanToken: "0x0000000000000000000000000000000000000002",
  }), /LOAN_TOKEN_MISMATCH/);
});
