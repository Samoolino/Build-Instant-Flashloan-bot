import assert from "node:assert/strict";
import test from "node:test";
import { createExecutionLockRecord, verifyExecutionLockRecord } from "./engagement-record.js";
import { lockForExecution, createLiveEngagementState } from "./live-engagement-state.js";

const observation = {
  planned: {
    network: { name: "Ethereum", chainId: 1, nativeSymbol: "ETH", rpcEnvVar: "ETH_RPC_URL" },
    candidate: {
      chainId: 1,
      loanToken: "0x0000000000000000000000000000000000000001",
      loanAmount: 1000n,
      tokenUsdPrice: 2500,
      tokenDecimals: 18,
      lenderPremiumUsd: 0.09,
      gasCostUsd: 0.05,
      swapFeesUsd: 0.1,
      slippageUsd: 0.02,
      finalAmount: 1001n,
      repaymentAmount: 1001n,
      planHash: "0xplan",
      simulationPassed: true,
      economicInputsVerified: true,
      legs: [{ chainId: 1, tokenIn: "0x0000000000000000000000000000000000000001", tokenOut: "0x0000000000000000000000000000000000000002", amountIn: 1000n, minimumAmountOut: 1n, quoteSource: "test" }],
    },
    netProfitUsd: 2.24,
    minimumProfitTokenUnits: 800000000000000n,
    decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" },
  },
  blockNumber: 100n,
  blockTimestampMs: 1000000,
  quoteBlockNumber: 100n,
  lenderPremiumBlockNumber: 100n,
  quoteSourceId: "quote:test",
  lenderSourceId: "aave:test",
};

test("creates and verifies an immutable execution-lock record", () => {
  const state = lockForExecution(createLiveEngagementState({
    chainId: 1,
    sourceIds: ["quote:test", "aave:test"],
    quoteBlockNumber: 100n,
    observedAtMs: 1000000,
    simulationPassed: true,
    eligible: true,
  }));
  const record = createExecutionLockRecord(observation, state);
  assert.equal(record.phase, "EXECUTION_LOCKED");
  assert.equal(record.executionAuthorization, 0);
  assert.equal(record.liveSigning, false);
  assert.equal(record.broadcastEnabled, false);
  verifyExecutionLockRecord(observation, record);
  assert.throws(() => {
    (record as { phase: "EXECUTION_LOCKED" }).phase = "EXECUTION_LOCKED";
  });
});

test("rejects a non-locked state", () => {
  const state = createLiveEngagementState({ chainId: 1, sourceIds: ["aave:test"], simulationPassed: true, eligible: true });
  assert.throws(() => createExecutionLockRecord(observation, state), /EXECUTION_LOCK_REQUIRED/);
});

test("rejects a tampered observation identity", () => {
  const state = lockForExecution(createLiveEngagementState({ chainId: 1, sourceIds: ["aave:test"], simulationPassed: true, eligible: true }));
  const record = createExecutionLockRecord(observation, state);
  const changed = { ...observation, blockNumber: 101n };
  assert.throws(() => verifyExecutionLockRecord(changed, record), /OBSERVATION_ID_MISMATCH/);
});
