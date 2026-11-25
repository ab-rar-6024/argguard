import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

test("fixture tool snapshots exist and are valid JSON", () => {
  const fixtures = ["calendar", "messaging", "ticketing"];
  for (const f of fixtures) {
    const file = `fixtures/${f}-tools.json`;
    assert.ok(existsSync(file), `${file} should exist`);
    const data = JSON.parse(readFileSync(file, "utf8"));
    assert.ok(Array.isArray(data), `${file} should contain an array of tools`);
    assert.strictEqual(data.length, 1);
    assert.ok(data[0].name);
    assert.ok(data[0].description);
    assert.ok(data[0].inputSchema);
  }
});
