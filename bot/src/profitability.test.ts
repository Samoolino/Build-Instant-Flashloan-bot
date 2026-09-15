import assert from "node:assert/strict";
import test from "node:test";

import { evaluateNetProfitUsd, usdFloorToTokenUnits } from "./profitability.js";

test("rejects a candidate below the $2 hard floor", () => {
  assert.deepEqual(evaluateNetProfitUsd(1.99), { eligible: false, reason: "BELOW_HARD_FLOOR" });
});

test("accepts exactly the $2 hard floor", () => {
  assert.deepEqual(evaluateNetProfitUsd(2), { eligible: true, reason: "ABOVE_HARD_FLOOR" });
});

test("marks $100 or more as target reached", () => {
  assert.deepEqual(evaluateNetProfitUsd(100), { eligible: true, reason: "TARGET_REACHED" });
});

test("converts the USD floor to token base units using price and decimals", () => {
  assert.equal(usdFloorToTokenUnits(2, 2500, 18), 800000000000000n);
});

test("rejects invalid price or decimals", () => {
  assert.throws(() => usdFloorToTokenUnits(2, 0, 18), /INVALID_TOKEN_USD_PRICE/);
  assert.throws(() => usdFloorToTokenUnits(2, 2500, -1), /INVALID_TOKEN_DECIMALS/);
});
