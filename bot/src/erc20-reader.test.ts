import assert from "node:assert/strict";
import test from "node:test";
import { readErc20Metadata } from "./erc20-reader.js";

const token = "0x1111111111111111111111111111111111111111";
const owner = "0x2222222222222222222222222222222222222222";

test("reads ERC20 decimals, symbol and balance without floating-point amounts", async () => {
  const calls: string[] = [];
  const rpc = {
    async request<T>(method: string, params: readonly unknown[] = []): Promise<T> {
      calls.push(method);
      const data = String((params[0] as { data?: string }).data);
      if (data === "0x313ce567") return "0x12" as T;
      if (data === "0x95d89b41") return (`0x${"12".padStart(64, "0")}5553444300000000000000000000000000000000000000000000000000000000`) as T;
      if (data.startsWith("0x70a08231")) return "0x123456789abcdef" as T;
      throw new Error(`UNEXPECTED_CALL:${data}`);
    },
  };
  const result = await readErc20Metadata(rpc, token, owner);
  assert.equal(result.decimals, 18);
  assert.equal(result.balance, 0x123456789abcdefn);
  assert.equal(calls.length, 3);
});

test("rejects malformed token addresses", async () => {
  const rpc = { request: async <T>(_method: string, _params: readonly unknown[] = []) => "0x12" as T };
  await assert.rejects(() => readErc20Metadata(rpc, "0x123", owner), /INVALID_TOKEN_ADDRESS/);
});
