import assert from "node:assert/strict";
import test from "node:test";
import { createExternalSignerIntent, verifyExternalSignerIntent } from "./external-signer-intent.js";
import type { ExecutionLockRecord } from "./engagement-record.js";

const record = {
  observationId: "sha256:" + "a".repeat(64), phase: "EXECUTION_LOCKED", chainId: 1, blockNumber: 100n, blockTimestampMs: 1_000_000,
  lenderPremiumBlockNumber: 100n, lenderSourceId: "aave:test", planHash: "0xplan", simulationPassed: true,
  economicInputsVerified: true, netProfitUsd: 5, minimumProfitTokenUnits: 1n, decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" },
  gasCostUsd: 1, loanToken: "0x0000000000000000000000000000000000000001", loanAmount: 1000n, repaymentAmount: 1001n,
  executionAuthorization: 0, liveSigning: false, broadcastEnabled: false,
} as ExecutionLockRecord;

const to = "0x0000000000000000000000000000000000000002";

test("creates and verifies an unsigned external signer intent", () => {
  const intent = createExternalSignerIntent(record, to, "0x1234", 0n, 1_000_000, 30_000);
  assert.equal(intent.observationId, record.observationId);
  assert.equal(intent.chainId, 1);
  assert.equal(intent.executionAuthorization, 0);
  assert.equal(intent.liveSigning, false);
  assert.equal(intent.broadcastEnabled, false);
  verifyExternalSignerIntent(intent, 1_010_000);
});

test("rejects expired signer intent", () => {
  const intent = createExternalSignerIntent(record, to, "0x", 0n, 1_000_000, 100);
  assert.throws(() => verifyExternalSignerIntent(intent, 1_100), /SIGNER_INTENT_EXPIRED/);
});

test("rejects malformed transaction target", () => {
  assert.throws(() => createExternalSignerIntent(record, "bad", "0x"), /INVALID_SIGNER_INTENT_ADDRESS/);
});
