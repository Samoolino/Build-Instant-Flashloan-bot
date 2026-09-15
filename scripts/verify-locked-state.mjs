const required = {
  EXECUTION_AUTHORIZATION: "0",
  AUTHORIZATION_STATE: "LOCKED",
  LIVE_SIGNING: "false",
  BROADCAST_ENABLED: "false",
  TRANSACTION_SIGNED: "false",
  TRANSACTION_BROADCAST: "false",
  LIVE_EXECUTION_READY: "false"
};

const failures = Object.entries(required).filter(([key, value]) => process.env[key] !== value);

if (failures.length) {
  console.error("LOCKED EXECUTION STATE VERIFICATION FAILED");
  for (const [key, expected] of failures) {
    console.error(`${key}: expected=${expected} actual=${process.env[key] ?? "UNSET"}`);
  }
  process.exit(1);
}

console.log("LOCKED EXECUTION STATE VERIFIED");
for (const [key, value] of Object.entries(required)) console.log(`${key}=${value}`);
