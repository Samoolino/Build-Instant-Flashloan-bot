import assert from "node:assert/strict";
import test from "node:test";
import { createExternalSignerIntent } from "./external-signer-intent.js";
import { correlateTransactionToIntent, type BroadcastTransaction } from "./transaction-intent-correlation.js";
import type { ExecutionLockRecord } from "./engagement-record.js";
import type { PostExecutionEvidence } from "./post-execution-evidence.js";

const record = {
  observationId: "sha256:" + "a".repeat(64), phase: "EXECUTION_LOCKED", chainId: 1, blockNumber: 100n, blockTimestampMs: 1_000_000,
  lenderPremiumBlockNumber: 100n, lenderSourceId: "aave:test", planHash: "0xplan", simulationPassed: true,
  economicInputsVerified: true, netProfitUsd: 5, minimumProfitTokenUnits: 1n, decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" },
  gasCostUsd: 1, loanToken: "0x0000000000000000000000000000000000000001", loanAmount: 1000n, repaymentAmount: 1001n,
  executionAuthorization: 0, liveSigning: false, broadcastEnabled: false,
} as ExecutionLockRecord;

const to = "0x0000000000000000000000000000000000000002";
const tx: BroadcastTransaction = { transactionHash: "0x" + "b".repeat(64), from: "0x0000000000000000000000000000000000000003", to, data: "0x1234", valueWei: 0n, chainId: 1 };
const evidence = {
  receipt: { transactionHash: tx.transactionHash, blockNumber: 101n, status: "SUCCESS", to, gasUsed: 21_000n, effectiveGasPriceWei: 1n, executionAuthorization: 0, liveSigning: false, broadcastEnabled: false },
  repayment: { lenderAddress: to, loanToken: record.loanToken, executorAddress: tx.from, repaymentAmount: 1001n, transactionHash: tx.transactionHash, blockNumber: 101n, verified: true },
  realizedProfit: { loanToken: record.loanToken, finalAssetBalance: 1025n, repaymentAmount: 1001n, realizedProfitTokenUnits: 24n, minimumProfitTokenUnits: 1n, profitable: true },
  verified: true,
} as PostExecutionEvidence;

test("correlates transaction with exact signer intent and evidence", () => {
  const intent = createExternalSignerIntent(record, to, tx.data, tx.valueWei, 1_000_000, 30_000);
  const result = correlateTransactionToIntent(record, intent, tx, evidence);
  assert.equal(result.observationId, record.observationId);
  assert.equal(result.planHash, record.planHash);
  assert.equal(result.transactionHash, tx.transactionHash);
  assert.equal(result.realizedProfitTokenUnits, 24n);
  assert.equal(result.verified, true);
});

test("rejects transaction calldata mismatch", () => {
  const intent = createExternalSignerIntent(record, to, tx.data, tx.valueWei, 1_000_000, 30_000);
  assert.throws(() => correlateTransactionToIntent(record, intent, { ...tx, data: "0x5678" }, evidence), /TRANSACTION_DATA_MISMATCH/);
});

test("rejects observation mismatch", () => {
  const intent = createExternalSignerIntent(record, to, tx.data, tx.valueWei, 1_000_000, 30_000);
  assert.throws(() => correlateTransactionToIntent(record, { ...intent, observationId: "sha256:" + "c".repeat(64) }, tx, evidence), /OBSERVATION_ID_MISMATCH/);
});
