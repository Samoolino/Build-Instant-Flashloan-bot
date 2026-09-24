export type AgenticDecision =
  | "OBSERVE"
  | "INVESTIGATE"
  | "REQUOTE"
  | "SIMULATE"
  | "REJECT"
  | "QUEUE_EXTERNAL_AUTH";

export type AgenticBoardInput = {
  chainId: number;
  phase: string;
  profitable: boolean;
  simulationPassed: boolean;
  netProfitUsd: number;
  minimumNetProfitUsd?: number;
  rpcHealthy: boolean;
  quoteFresh: boolean;
  executionLocked: boolean;
};

export type AgenticBoardState = {
  mode: "OBSERVE_ONLY";
  decision: AgenticDecision;
  reason: string;
  executionAuthorization: 0;
  liveSigning: false;
  broadcastEnabled: false;
  transactionSigned: false;
  transactionBroadcast: false;
};

const MIN_NET_PROFIT_USD = 2;

export function evaluateAgenticBoard(input: AgenticBoardInput): AgenticBoardState {
  if (!Number.isInteger(input.chainId) || input.chainId <= 0) throw new Error("INVALID_CHAIN_ID");
  if (!Number.isFinite(input.netProfitUsd)) throw new Error("INVALID_NET_PROFIT");
  if (!input.rpcHealthy) return locked("INVESTIGATE", "RPC_UNHEALTHY");
  if (!input.quoteFresh) return locked("REQUOTE", "QUOTE_STALE");
  if (!input.simulationPassed) return locked("SIMULATE", "SIMULATION_REQUIRED");
  const floor = input.minimumNetProfitUsd ?? MIN_NET_PROFIT_USD;
  if (!Number.isFinite(floor) || floor < 0) throw new Error("INVALID_NET_PROFIT_FLOOR");
  if (!input.profitable || input.netProfitUsd < floor) return locked("REJECT", "NET_PROFIT_BELOW_FLOOR");
  if (!input.executionLocked) return locked("OBSERVE", "EXECUTION_LOCK_REQUIRED");
  return locked("QUEUE_EXTERNAL_AUTH", "PROFITABLE_AND_LOCKED_EXTERNAL_AUTH_REQUIRED");
}

function locked(decision: AgenticDecision, reason: string): AgenticBoardState {
  return Object.freeze({
    mode: "OBSERVE_ONLY",
    decision,
    reason,
    executionAuthorization: 0,
    liveSigning: false,
    broadcastEnabled: false,
    transactionSigned: false,
    transactionBroadcast: false,
  });
}
