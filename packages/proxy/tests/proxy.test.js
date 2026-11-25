import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { ProxyServer } from "../src/proxy.js";
import { validateSchema } from "../src/schemaValidator.js";
import { stripAnsi, sanitizeData } from "../src/audit.js";

test("schemaValidator: validates valid and invalid payloads", () => {
  const schema = {
    type: "object",
    properties: {
      name: { type: "string" },
      age: { type: "integer" },
      status: { enum: ["active", "inactive"] }
    },
    required: ["name"]
  };

  const pass = validateSchema(schema, { name: "Alice", age: 30, status: "active" });
  assert.strictEqual(pass.valid, true);

  const fail1 = validateSchema(schema, { age: 30 });
  assert.strictEqual(fail1.valid, false);
  assert.match(fail1.errors[0], /name is a required field/);

  const fail2 = validateSchema(schema, { name: "Bob", status: "invalid" });
  assert.strictEqual(fail2.valid, false);
  assert.match(fail2.errors[0], /must be one of/);
});

test("audit & security: stripAnsi and sanitizeData scrub secrets and escape codes", () => {
  const raw = "\x1B[31mRed text with api_key: 'secret12345'\x1B[0m and Bearer token123";
  const cleaned = sanitizeData(raw);
  assert.strictEqual(cleaned.includes("\x1B"), false);
  assert.strictEqual(cleaned.includes("secret12345"), false);
  assert.ok(cleaned.includes("[REDACTED]"));

  const obj = {
    auth_token: "supersecret",
    normal: "\x1B[32mhello\x1B[0m"
  };
  const cleanedObj = sanitizeData(obj);
  assert.strictEqual(cleanedObj.auth_token, "[REDACTED]");
  assert.strictEqual(cleanedObj.normal, "hello");
});

test("proxy: pass-through equality and audit logging with calendar fixture", async () => {
  const auditPath = "test-audit.jsonl";
  if (existsSync(auditPath)) {
    try { rmSync(auditPath); } catch {}
  }

  const clientInput = new PassThrough();
  const clientOutput = new PassThrough();

  const proxy = new ProxyServer({
    targetCommand: "node",
    targetArgs: ["fixtures/calendar/server.js"],
    auditFile: auditPath,
    mode: "audit"
  });

  proxy.start(clientInput, clientOutput);

  let captured = [];
  clientOutput.on("data", (chunk) => {
    const lines = chunk.toString().trim().split("\n");
    for (const l of lines) {
      if (l.trim()) {
        try { captured.push(JSON.parse(l)); } catch {}
      }
    }
  });

  // 1. Send tools/list
  clientInput.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\n");
  await new Promise((r) => setTimeout(r, 500));

  assert.strictEqual(captured.length, 1);
  assert.strictEqual(captured[0].id, 1);
  assert.strictEqual(captured[0].result.tools[0].name, "create_event");

  // 2. Send tools/call
  clientInput.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "create_event",
        arguments: { title: "Team Sync", start_time: "2026-11-26T10:00:00" }
      }
    }) + "\n"
  );
  await new Promise((r) => setTimeout(r, 500));

  assert.strictEqual(captured.length, 2);
  assert.strictEqual(captured[1].id, 2);
  assert.strictEqual(captured[1].result.content[0].text, "Event created: Team Sync at 2026-11-26T10:00:00");

  proxy.stop();
  clientInput.end();

  // Verify audit log exists
  assert.ok(existsSync(auditPath));
  const logLines = readFileSync(auditPath, "utf8").trim().split("\n").map(JSON.parse);
  assert.ok(logLines.length >= 1);
  assert.strictEqual(logLines[0].tool, "create_event");
  assert.strictEqual(logLines[0].schemaValid, true);

  try { rmSync(auditPath); } catch {}
});

test("proxy: hostile client handling (oversized payload and invalid JSON)", async () => {
  const clientInput = new PassThrough();
  const clientOutput = new PassThrough();

  const proxy = new ProxyServer({
    targetCommand: "node",
    targetArgs: ["fixtures/calendar/server.js"],
    maxPayloadBytes: 100 // tiny limit for testing
  });

  proxy.start(clientInput, clientOutput);

  let captured = [];
  clientOutput.on("data", (chunk) => {
    const lines = chunk.toString().trim().split("\n");
    for (const l of lines) {
      if (l.trim()) captured.push(JSON.parse(l));
    }
  });

  // Send oversized message
  const largeMsg = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping", data: "x".repeat(200) });
  clientInput.write(largeMsg + "\n");
  await new Promise((r) => setTimeout(r, 200));

  assert.strictEqual(captured.length, 1);
  assert.strictEqual(captured[0].error.code, -32600);
  assert.match(captured[0].error.message, /Payload size exceeded/);

  // Send invalid JSON
  clientInput.write("{invalid-json\n");
  await new Promise((r) => setTimeout(r, 200));

  assert.strictEqual(captured.length, 2);
  assert.strictEqual(captured[1].error.code, -32700);

  proxy.stop();
});

test("proxy: timeout handling for hanging target", async () => {
  const clientInput = new PassThrough();
  const clientOutput = new PassThrough();

  // Target that hangs forever
  const proxy = new ProxyServer({
    targetCommand: "node",
    targetArgs: ["-e", "setInterval(() => {}, 1000)"],
    timeoutMs: 200
  });

  proxy.start(clientInput, clientOutput);

  let captured = [];
  clientOutput.on("data", (chunk) => {
    const lines = chunk.toString().trim().split("\n");
    for (const l of lines) {
      if (l.trim()) captured.push(JSON.parse(l));
    }
  });

  clientInput.write(JSON.stringify({ jsonrpc: "2.0", id: 10, method: "ping" }) + "\n");
  await new Promise((r) => setTimeout(r, 400));

  assert.strictEqual(captured.length, 1);
  assert.strictEqual(captured[0].id, 10);
  assert.strictEqual(captured[0].error.code, -32000);
  assert.match(captured[0].error.message, /timed out/);

  proxy.stop();
});
