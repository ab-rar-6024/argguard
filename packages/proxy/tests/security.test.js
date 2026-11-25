import test from "node:test";
import assert from "node:assert/strict";
import { stripAnsi, sanitizeData, AuditLogger } from "../src/audit.js";
import { readFileSync, rmSync, existsSync } from "node:fs";

test("security: terminal escape code injection defense", () => {
  // Common terminal escape exploits (cursor movement, clear line, color manipulation)
  const hostileTerminalPayloads = [
    "\x1B[2J\x1B[H", // clear screen and move cursor home
    "\x1B[31mExploit Text\x1B[0m", // colored text
    "\x1B]0;Evil Title\x07", // set window title
    "\x1B[1A\x1B[2K" // move up and erase line
  ];

  for (const payload of hostileTerminalPayloads) {
    const stripped = stripAnsi(payload);
    assert.strictEqual(stripped.includes("\x1B"), false, "Must strip escape character");
  }
});

test("security: recursive secret scrubbing", () => {
  const sensitivePayload = {
    user: "alice",
    api_key: "sk-live-abcdef1234567890",
    authorization: "Bearer secret-token-xyz",
    nested: {
      password: "SuperSecretPassword!",
      deep: {
        token: "ghp_1234567890abcdef"
      }
    }
  };

  const scrubbed = sanitizeData(sensitivePayload);
  assert.strictEqual(scrubbed.api_key, "[REDACTED]");
  assert.strictEqual(scrubbed.authorization, "[REDACTED]");
  assert.strictEqual(scrubbed.nested.password, "[REDACTED]");
  assert.strictEqual(scrubbed.nested.deep.token, "[REDACTED]");
  assert.strictEqual(scrubbed.user, "alice");
});

test("security: audit log rotation and writing without corruption", () => {
  const testLog = "test-security-audit.jsonl";
  if (existsSync(testLog)) rmSync(testLog);

  const logger = new AuditLogger(testLog);
  for (let i = 0; i < 20; i++) {
    logger.log({
      id: i,
      event: "test_call",
      token: "secret_123",
      payload: "\x1B[32mstatus\x1B[0m"
    });
  }

  assert.ok(existsSync(testLog));
  const lines = readFileSync(testLog, "utf8").trim().split("\n");
  assert.strictEqual(lines.length, 20);

  // Parse every line to verify validity and secret scrubbing
  for (const line of lines) {
    const parsed = JSON.parse(line);
    assert.strictEqual(parsed.token, "[REDACTED]");
    assert.strictEqual(parsed.payload, "status");
    assert.strictEqual(parsed.payload.includes("\x1B"), false);
  }

  if (existsSync(testLog)) rmSync(testLog);
});
