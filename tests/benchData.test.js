import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

test("ToolArgBench: data files exist and hashes match stats.json", () => {
  const statsPath = "bench/data/stats.json";
  assert.ok(existsSync(statsPath), "stats.json should exist");
  const stats = JSON.parse(readFileSync(statsPath, "utf8"));

  assert.strictEqual(stats.seed, 20261125);
  assert.strictEqual(stats.counts.train, 200);
  assert.strictEqual(stats.counts.dev, 100);
  assert.strictEqual(stats.counts.test, 100);
  assert.strictEqual(stats.counts.fresh, 50);

  for (const [filename, expectedHash] of Object.entries(stats.hashes)) {
    const filePath = `bench/data/${filename}`;
    assert.ok(existsSync(filePath), `${filePath} should exist`);
    const raw = readFileSync(filePath, "utf8");
    // Normalize CRLF to LF so cryptographic checks are invariant across git checkout settings on Windows/Linux
    const normalized = raw.replace(/\r\n/g, "\n");
    const actualHash = createHash("sha256").update(normalized).digest("hex");
    assert.strictEqual(actualHash, expectedHash, `Hash mismatch for ${filename}`);
  }
});
