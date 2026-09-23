import test from "node:test";
import assert from "node:assert/strict";
import { evaluateAgenticBoard } from "./agentic-board.js";

const base = {
  chainId: 1,
  phase: "PROFITABLE",
  profitable: true,
  simulationPassed: true,
  netProfitUsd: 4,
  rpcHealthy: true,
  quoteFresh: true,
  executionLocked: true,
};

test("Hermes board queues profitable locked opportunity for external authorization only", () => {
  const state = evaluateAgenticBoard(base);
  assert.equal(state.decision, "QUEUE_EXTERNAL_AUTH");
  assert.equal(state.executionAuthorization, 0);
  assert.equal(state.liveSigning, false);
  assert.equal(state.broadcastEnabled, false);
});

test("board rejects opportunity below the $2 economic floor", () => {
  const state = evaluateAgenticBoard({ ...base, netProfitUsd: 1.99 });
  assert.equal(state.decision, "REJECT");
  assert.equal(state.reason, "NET_PROFIT_BELOW_FLOOR");
});

test("board requests re-quote when quote is stale", () => {
  const state = evaluateAgenticBoard({ ...base, quoteFresh: false });
  assert.equal(state.decision, "REQUOTE");
});

test("board never becomes an execution authority", () => {
  for (const input of [
    base,
    { ...base, rpcHealthy: false },
    { ...base, simulationPassed: false },
    { ...base, executionLocked: false },
  ]) {
    const state = evaluateAgenticBoard(input);
    assert.equal(state.executionAuthorization, 0);
    assert.equal(state.liveSigning, false);
    assert.equal(state.broadcastEnabled, false);
    assert.equal(state.transactionSigned, false);
    assert.equal(state.transactionBroadcast, false);
  }
});
