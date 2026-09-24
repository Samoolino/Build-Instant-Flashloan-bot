import { createHash } from "node:crypto";
import type { ExternalSignerIntent } from "./external-signer-intent.js";
import { verifyExternalSignerIntent } from "./external-signer-intent.js";

export type LiveRpc = {
  request<T>(method: string, params: unknown[]): Promise<T>;
};

export type LiveQuote = {
  source: string;
  quoteBlockNumber: bigint;
  amountOut: bigint;
  minimumAmountOut: bigint;
  fresh: boolean;
};

export interface LiveStrategyAdapter {
  discover(input: { chainId: number; loanToken: string; loanAmount: bigint }): Promise<{
    target: string;
    data: string;
    quote: LiveQuote;
    netProfitUsd: number;
    economicInputsVerified: boolean;
    planHash: string;
  }>;
}

export type SimulationResult = {
  passed: boolean;
  gasEstimate: bigint;
  returnData: string;
};

export type SignedTransaction = {
  rawTransaction: string;
};

export interface ExternalSigner {
  sign(intent: ExternalSignerIntent, authorization: string): Promise<SignedTransaction>;
}

export interface ProfitObserver {
  realizedProfitUsd(input: {
    chainId: number;
    txHash: string;
    receipt: Record<string, unknown>;
  }): Promise<number>;
}

export type LiveExecutionResult = {
  observationId: string;
  planHash: string;
  txHash: string;
  receipt: Record<string, unknown>;
  realizedProfitUsd: number;
  feedback: {
    predictedProfitUsd: number;
    realizedProfitUsd: number;
    varianceUsd: number;
    status: "PROFIT_CONFIRMED" | "PROFIT_MISSED";
  };
};

function hex(value: string, error: string): void {
  if (!/^0x[0-9a-fA-F]*$/.test(value)) throw new Error(error);
}

function address(value: string, error: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(error);
}

function audit(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v)).digest("hex");
}

async function waitForReceipt(rpc: LiveRpc, txHash: string, timeoutMs: number, pollMs: number): Promise<Record<string, unknown>> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const receipt = await rpc.request<Record<string, unknown> | null>("eth_getTransactionReceipt", [txHash]);
    if (receipt) {
      const status = String(receipt.status ?? "0x0");
      if (status !== "0x1" && status !== "0x01") throw new Error("TRANSACTION_REVERTED");
      return receipt;
    }
    await new Promise(resolve => setTimeout(resolve, pollMs));
  }
  throw new Error("RECEIPT_TIMEOUT");
}

/**
 * Completes the live execution corridor after a validated execution lock.
 *
 * The signer is deliberately injected: this module never holds or derives a
 * private key. Broadcast is performed only after the external signer returns
 * a signed transaction and the caller has explicitly enabled the live gateway.
 */
export async function executeLiveCorridor(input: {
  rpc: LiveRpc;
  intent: ExternalSignerIntent;
  predictedProfitUsd: number;
  authorization: string;
  signer: ExternalSigner;
  profitObserver: ProfitObserver;
  liveExecutionEnabled: boolean;
  broadcastEnabled: boolean;
  receiptTimeoutMs?: number;
  receiptPollMs?: number;
}): Promise<LiveExecutionResult> {
  if (!input.liveExecutionEnabled || !input.broadcastEnabled) throw new Error("LIVE_EXECUTION_GATE_DISABLED");
  if (!input.authorization.trim()) throw new Error("EXTERNAL_AUTHORIZATION_REQUIRED");
  if (!Number.isFinite(input.predictedProfitUsd)) throw new Error("INVALID_PREDICTED_PROFIT");
  verifyExternalSignerIntent(input.intent);

  const signed = await input.signer.sign(input.intent, input.authorization);
  hex(signed.rawTransaction, "INVALID_SIGNED_TRANSACTION");
  if (signed.rawTransaction === "0x") throw new Error("EMPTY_SIGNED_TRANSACTION");

  const txHash = await input.rpc.request<string>("eth_sendRawTransaction", [signed.rawTransaction]);
  hex(txHash, "INVALID_TRANSACTION_HASH");

  const receipt = await waitForReceipt(
    input.rpc,
    txHash,
    input.receiptTimeoutMs ?? 180_000,
    input.receiptPollMs ?? 2_000,
  );
  const realizedProfitUsd = await input.profitObserver.realizedProfitUsd({
    chainId: input.intent.chainId,
    txHash,
    receipt,
  });
  if (!Number.isFinite(realizedProfitUsd)) throw new Error("INVALID_REALIZED_PROFIT");

  const varianceUsd = realizedProfitUsd - input.predictedProfitUsd;
  return Object.freeze({
    observationId: input.intent.observationId,
    planHash: input.intent.planHash,
    txHash,
    receipt,
    realizedProfitUsd,
    feedback: {
      predictedProfitUsd: input.predictedProfitUsd,
      realizedProfitUsd,
      varianceUsd,
      status: realizedProfitUsd >= 2 ? "PROFIT_CONFIRMED" : "PROFIT_MISSED",
    },
  });
}

export function createExecutionObservation(input: {
  chainId: number;
  target: string;
  data: string;
  quote: LiveQuote;
  planHash: string;
}): string {
  address(input.target, "INVALID_STRATEGY_TARGET");
  hex(input.data, "INVALID_STRATEGY_DATA");
  if (!input.quote.fresh) throw new Error("QUOTE_NOT_FRESH");
  if (input.quote.amountOut < input.quote.minimumAmountOut) throw new Error("QUOTE_BELOW_MINIMUM");
  return audit(input);
}
