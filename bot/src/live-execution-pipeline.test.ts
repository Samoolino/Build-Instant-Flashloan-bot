import test from "node:test";
import assert from "node:assert/strict";
import { createExecutionObservation, executeLiveCorridor } from "./live-execution-pipeline.js";
import type { ExternalSignerIntent } from "./external-signer-intent.js";

const intent: ExternalSignerIntent = {
  kind: "EXTERNAL_SIGNER_INTENT",
  observationId: "obs-1",
  chainId: 1,
  to: "0x1111111111111111111111111111111111111111",
  data: "0x1234",
  valueWei: 0n,
  planHash: "plan-1",
  loanToken: "0x2222222222222222222222222222222222222222",
  loanAmount: 1000n,
  repaymentAmount: 1001n,
  minimumProfitTokenUnits: 2n,
  expiresAtMs: Date.now() + 30_000,
  executionAuthorization: 0,
  liveSigning: false,
  broadcastEnabled: false,
};

test("live corridor fails closed without explicit gates", async () => {
  await assert.rejects(
    executeLiveCorridor({
      rpc: { request: async () => { throw new Error("must not call rpc"); } },
      intent,
      predictedProfitUsd: 5,
      authorization: "",
      signer: { sign: async () => ({ rawTransaction: "0x01" }) },
      profitObserver: { realizedProfitUsd: async () => 5 },
      liveExecutionEnabled: false,
      broadcastEnabled: false,
    }),
    /LIVE_EXECUTION_GATE_DISABLED/,
  );
});

test("strategy observation requires a fresh safe quote", () => {
  const id = createExecutionObservation({
    chainId: 1,
    target: intent.to,
    data: intent.data,
    quote: { source: "test", quoteBlockNumber: 1n, amountOut: 101n, minimumAmountOut: 100n, fresh: true },
    planHash: "plan-1",
  });
  assert.match(id, /^[0-9a-f]{64}$/);
});

test("live corridor signs externally, broadcasts, waits for receipt and records realized profit", async () => {
  const calls: string[] = [];
  let receiptCalls = 0;
  const result = await executeLiveCorridor({
    rpc: {
      request: async <T>(method: string, _params: unknown[]): Promise<T> => {
        calls.push(method);
        if (method === "eth_sendRawTransaction") return ("0x" + "a".repeat(64)) as T;
        if (method === "eth_getTransactionReceipt") {
          receiptCalls += 1;
          return ({ status: "0x1", transactionHash: "0x" + "a".repeat(64) }) as T;
        }
        throw new Error("unexpected rpc");
      },
    },
    intent,
    predictedProfitUsd: 5,
    authorization: "explicit-test-authorization",
    signer: {
      sign: async (_intent, auth) => {
        assert.equal(auth, "explicit-test-authorization");
        return { rawTransaction: "0xdeadbeef" };
      },
    },
    profitObserver: { realizedProfitUsd: async () => 6.25 },
    liveExecutionEnabled: true,
    broadcastEnabled: true,
    receiptPollMs: 1,
    receiptTimeoutMs: 1000,
  });

  assert.deepEqual(calls, ["eth_sendRawTransaction", "eth_getTransactionReceipt"]);
  assert.equal(receiptCalls, 1);
  assert.equal(result.realizedProfitUsd, 6.25);
  assert.equal(result.feedback.varianceUsd, 1.25);
  assert.equal(result.feedback.status, "PROFIT_CONFIRMED");
});
