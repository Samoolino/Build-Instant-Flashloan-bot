import assert from "node:assert/strict";
import test from "node:test";
import { configuredRegistryEntries, DEX_REGISTRY, LENDER_REGISTRY, registryForNetwork } from "./liquidity-registry.js";

test("registry rejects unsupported chains", () => {
  assert.throws(() => registryForNetwork(LENDER_REGISTRY, 999999), /UNSUPPORTED_CANONICAL_CHAIN/);
});

test("registry never treats an address alone as enabled", () => {
  const entries = configuredRegistryEntries(LENDER_REGISTRY, 1, {
    AAVE_V3_POOL_ETHEREUM: "0x123",
  });
  assert.equal(entries.length, 0);
});

test("registry requires explicit enable flag and address", () => {
  const entries = configuredRegistryEntries(LENDER_REGISTRY, 1, {
    AAVE_V3_POOL_ETHEREUM: "0x123",
    AAVE_V3_ENABLED_ETHEREUM: "true",
  });
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.id, "aave-v3");
});

test("DEX registry is network-scoped", () => {
  const entries = registryForNetwork(DEX_REGISTRY, 56);
  assert.deepEqual(entries.map((entry) => entry.id), ["sushi-v2"]);
});
