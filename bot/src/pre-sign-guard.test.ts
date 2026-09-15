import assert from "node:assert/strict";
import test from "node:test";
import { runPreSignGuard } from "./pre-sign-guard.js";
import { createExternalSignerIntent } from "./external-signer-intent.js";
import type { ExecutionLockRecord } from "./engagement-record.js";
import type { EngagementObservation } from "./engagement-observation.js";

const candidate = {
  chainId: 1, loanToken: "0x0000000000000000000000000000000000000001", loanAmount: 1000n,
  tokenUsdPrice: 2500, tokenDecimals: 18, lenderPremiumUsd: 1, gasCostUsd: 1, swapFeesUsd: 0, slippageUsd: 0,
  finalAmount: 1100n, repaymentAmount: 1001n, planHash: "0xplan", simulationPassed: true,
  economicInputsVerified: true, legs: [],
};
const observation = {
  planned: { network: { name: "Ethereum", chainId: 1, nativeSymbol: "ETH", rpcEnvVar: "ETH_RPC_URL" }, candidate,
    netProfitUsd: 5, minimumProfitTokenUnits: 1n, decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" } },
  blockNumber: 100n, blockTimestampMs: 1_000_000, lenderPremiumBlockNumber: 100n, lenderSourceId: "aave:test",
} as unknown as EngagementObservation;
const record = {
  observationId: "sha256:" + "a".repeat(64), phase: "EXECUTION_LOCKED", chainId: 1, blockNumber: 100n, blockTimestampMs: 1_000_000,
  lenderPremiumBlockNumber: 100n, lenderSourceId: "aave:test", planHash: "0xplan", simulationPassed: true,
  economicInputsVerified: true, netProfitUsd: 5, minimumProfitTokenUnits: 1n, decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" },
  gasCostUsd: 1, loanToken: candidate.loanToken, loanAmount: 1000n, repaymentAmount: 1001n,
  executionAuthorization: 0, liveSigning: false, broadcastEnabled: false,
} as unknown as ExecutionLockRecord;

// The observation ID must match the record in real usage; guard behavior is tested after constructing a matching intent.
// This fixture intentionally focuses on the independent expiry and block gates.
test("rejects a stale observation", () => {
  const intent = createExternalSignerIntent(record, "0x0000000000000000000000000000000000000002", "0x", 0n, 1_030_000, 30_000);
  assert.throws(() => runPreSignGuard(observation, record, intent, 101n, 1_030_001), /OBSERVATION_STALE|OBSERVATION_ID_MISMATCH/);
});

test("rejects a regressed block before signing", () => {
  const intent = createExternalSignerIntent(record, "0x0000000000000000000000000000000000000002", "0x", 0n, 1_000_001, 30_000);
  assert.throws(() => runPreSignGuard(observation, record, intent, 99n, 1_000_002), /OBSERVATION_ID_MISMATCH|CURRENT_BLOCK_REGRESSED/);
});
