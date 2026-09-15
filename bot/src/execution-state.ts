export const executionState = Object.freeze({
  authorization: 0,
  authorizationState: "LOCKED",
  liveSigning: false,
  broadcastEnabled: false,
  transactionSigned: false,
  transactionBroadcast: false,
  liveExecutionReady: false
} as const);

export function assertLocked(): void {
  if (executionState.authorization !== 0 || executionState.authorizationState !== "LOCKED") {
    throw new Error("EXECUTION_STATE_NOT_LOCKED");
  }
  if (executionState.liveSigning || executionState.broadcastEnabled || executionState.transactionSigned || executionState.transactionBroadcast || executionState.liveExecutionReady) {
    throw new Error("LIVE_EXECUTION_STATE_ENABLED");
  }
}
