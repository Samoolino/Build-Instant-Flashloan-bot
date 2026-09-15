import assert from "node:assert/strict";
import test from "node:test";
import { createLiveEngagementState, lockForExecution } from "./live-engagement-state.js";

test("creates a live observation state without enabling execution", () => {
  const state = createLiveEngagementState({
    chainId: 1,
    sourceIds: ["uniswap-v3-quoter-v2:1"],
    quoteBlockNumber: 100n,
    observedAtMs: 1_000,
    simulationPassed: true,
    eligible: true,
  });
  assert.equal(state.phase, "PROFITABLE");
  assert.equal(state.executionAuthorization, 0);
  assert.equal(state.liveSigning, false);
  assert.equal(state.broadcastEnabled, false);
});

test("requires simulation before a route can be marked profitable", () => {
  const state = createLiveEngagementState({
    chainId: 8453,
    sourceIds: ["quote-source"],
    observedAtMs: 1_000,
    simulationPassed: false,
    eligible: true,
  });
  assert.equal(state.phase, "SIMULATING");
  assert.equal(state.eligible, true);
});

test("locks a profitable observation without granting execution authority", () => {
  const state = createLiveEngagementState({
    chainId: 56,
    sourceIds: ["quote-source"],
    observedAtMs: 1_000,
    simulationPassed: true,
    eligible: true,
  });
  const locked = lockForExecution(state);
  assert.equal(locked.phase, "EXECUTION_LOCKED");
  assert.equal(locked.executionAuthorization, 0);
  assert.equal(locked.liveSigning, false);
  assert.equal(locked.broadcastEnabled, false);
});

test("rejects invalid live engagement observations", () => {
  assert.throws(() => createLiveEngagementState({ chainId: 0, sourceIds: ["x"], observedAtMs: 1 }), /INVALID_ENGAGEMENT_CHAIN_ID/);
  assert.throws(() => createLiveEngagementState({ chainId: 1, sourceIds: [], observedAtMs: 1 }), /ENGAGEMENT_SOURCE_REQUIRED/);
  assert.throws(() => createLiveEngagementState({ chainId: 1, sourceIds: [""], observedAtMs: 1 }), /ENGAGEMENT_SOURCE_REQUIRED/);
  assert.throws(() => createLiveEngagementState({ chainId: 1, sourceIds: ["x"], observedAtMs: -1 }), /INVALID_ENGAGEMENT_TIMESTAMP/);
});

test("does not allow a rejected observation to enter the execution lock", () => {
  const state = createLiveEngagementState({
    chainId: 1,
    sourceIds: ["quote-source"],
    observedAtMs: 1_000,
    simulationPassed: true,
    eligible: false,
  });
  assert.equal(state.phase, "REJECTED");
  assert.throws(() => lockForExecution(state), /ENGAGEMENT_NOT_PROFITABLE/);
});
