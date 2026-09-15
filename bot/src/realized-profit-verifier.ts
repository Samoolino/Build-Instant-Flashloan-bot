import type { ExecutionLockRecord } from "./engagement-record.js";

export type RealizedProfitInput = {
  finalAssetBalance: bigint;
  repaymentAmount: bigint;
  minimumProfitTokenUnits: bigint;
  expectedLoanToken: string;
};

export type RealizedProfitVerification = {
  loanToken: string;
  finalAssetBalance: bigint;
  repaymentAmount: bigint;
  realizedProfitTokenUnits: bigint;
  minimumProfitTokenUnits: bigint;
  profitable: boolean;
};

function address(value: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("INVALID_PROFIT_TOKEN_ADDRESS");
}

/** Verifies realized token profit from externally observed post-transaction balances. No signing or broadcasting occurs. */
export function verifyRealizedProfit(
  record: ExecutionLockRecord,
  input: RealizedProfitInput,
): RealizedProfitVerification {
  if (record.executionAuthorization !== 0 || record.liveSigning || record.broadcastEnabled) {
    throw new Error("EXECUTION_LOCK_POLICY_VIOLATION");
  }
  address(input.expectedLoanToken);
  if (input.expectedLoanToken.toLowerCase() !== record.loanToken.toLowerCase()) {
    throw new Error("LOAN_TOKEN_MISMATCH");
  }
  if (input.finalAssetBalance < 0n || input.repaymentAmount < 0n || input.minimumProfitTokenUnits < 0n) {
    throw new Error("INVALID_PROFIT_ACCOUNTING_INPUT");
  }
  if (input.finalAssetBalance < input.repaymentAmount) {
    throw new Error("REPAYMENT_NOT_COVERED");
  }
  const realizedProfitTokenUnits = input.finalAssetBalance - input.repaymentAmount;
  if (realizedProfitTokenUnits < input.minimumProfitTokenUnits) {
    throw new Error("REALIZED_PROFIT_BELOW_MINIMUM");
  }
  return Object.freeze({
    loanToken: input.expectedLoanToken,
    finalAssetBalance: input.finalAssetBalance,
    repaymentAmount: input.repaymentAmount,
    realizedProfitTokenUnits,
    minimumProfitTokenUnits: input.minimumProfitTokenUnits,
    profitable: true,
  });
}

/** Ensures the post-execution accounting uses the lock's loan token and repayment amount. */
export function verifyRealizedProfitAgainstLock(
  record: ExecutionLockRecord,
  finalAssetBalance: bigint,
): RealizedProfitVerification {
  return verifyRealizedProfit(record, {
    finalAssetBalance,
    repaymentAmount: record.repaymentAmount,
    minimumProfitTokenUnits: record.minimumProfitTokenUnits,
    expectedLoanToken: record.loanToken,
  });
}
