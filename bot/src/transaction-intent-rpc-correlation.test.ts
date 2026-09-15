import test from "node:test";
import assert from "node:assert/strict";
import { correlateTransactionToIntentFromRpc } from "./transaction-intent-rpc-correlation.js";

const signer = "0x1111111111111111111111111111111111111111";
const target = "0x2222222222222222222222222222222222222222";
const hash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function fixture() {
  const record = {
    observationId: "sha256:obs",
    phase: "EXECUTION_LOCKED" as const,
    chainId: 1,
    blockNumber: 100n,
    blockTimestampMs: 1000,
    lenderPremiumBlockNumber: 100n,
    lenderSourceId: "aave-v3",
    planHash: "0xplan",
    simulationPassed: true,
    economicInputsVerified: true,
    netProfitUsd: 24,
    minimumProfitTokenUnits: 2n,
    decision: { eligible: true, reason: "ABOVE_HARD_FLOOR" },
    gasCostUsd: 1,
    loanToken: target,
    loanAmount: 1000n,
    repaymentAmount: 1001n,
    executionAuthorization: 0 as const,
    liveSigning: false as const,
    broadcastEnabled: false as const,
  };
  const intent = {
    kind: "FLASH_ARB" as const,
    observationId: record.observationId,
    chainId: 1,
    to: target,
    data: "0x1234",
    valueWei: 0n,
    planHash: record.planHash,
    loanToken: target,
    loanAmount: 1000n,
    repaymentAmount: 1001n,
    minimumProfit: 2n,
    expiresAtMs: 2000,
    executionAuthorization: 0 as const,
    liveSigning: false as const,
    broadcastEnabled: false as const,
  };
  const evidence = {
    receipt: {
      transactionHash: hash,
      blockNumber: 101n,
      status: "SUCCESS" as const,
      to: target,
      gasUsed: 21000n,
      effectiveGasPriceWei: 1n,
      executionAuthorization: 0 as const,
      liveSigning: false as const,
      broadcastEnabled: false as const,
    },
    repayment: { lenderAddress: target, loanToken: target, executorAddress: signer, repaymentAmount: 1001n, transactionHash: hash, blockNumber: 101n, verified: true as const },
    realizedProfit: { loanToken: target, finalAssetBalance: 1025n, repaymentAmount: 1001n, realizedProfitTokenUnits: 24n, minimumProfitTokenUnits: 2n, profitable: true },
    verified: true as const,
  };
  return { record, intent, evidence };
}

function rpc(tx: object | null, chainId = "0x1") {
  return { request: async <T>(method: string): Promise<T> => {
    if (method === "eth_chainId") return chainId as T;
    return tx as T;
  } };
}

test("correlates transaction read from RPC", async () => {
  const { record, intent, evidence } = fixture();
  const result = await correlateTransactionToIntentFromRpc(
    rpc({ hash, from: signer, to: target, input: "0x1234", value: "0x0", chainId: "0x1" }),
    record,
    intent,
    hash,
    signer,
    evidence,
  );
  assert.equal(result.verified, true);
  assert.equal(result.from, signer);
  assert.equal(result.planHash, record.planHash);
});

test("rejects transaction signed by unexpected external signer", async () => {
  const { record, intent, evidence } = fixture();
  await assert.rejects(
    correlateTransactionToIntentFromRpc(
      rpc({ hash, from: "0x3333333333333333333333333333333333333333", to: target, input: "0x1234", value: "0x0", chainId: "0x1" }),
      record,
      intent,
      hash,
      signer,
      evidence,
    ),
    /TRANSACTION_SIGNER_MISMATCH/,
  );
});
