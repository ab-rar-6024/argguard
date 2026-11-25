import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { ProxyServer } from "../src/proxy.js";

test("enforce mode with RuleChecker: clarifies unstated parameters", async () => {
  const clientInput = new PassThrough();
  const clientOutput = new PassThrough();

  const proxy = new ProxyServer({
    targetCommand: "node",
    targetArgs: ["fixtures/calendar/server.js"],
    mode: "enforce"
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

  // 1. List tools to cache schemas
  clientInput.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\n");
  await new Promise((r) => setTimeout(r, 400));

  // 2. Call with unstated parameter in sources
  clientInput.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "create_event",
        arguments: {
          title: "Quarterly Strategy",
          start_time: "2026-11-28T14:00:00" // Not mentioned in source text!
        },
        _meta: {
          argguard: {
            sources: [
              {
                id: "doc1",
                trust: "untrusted",
                text: "Please prepare for the Quarterly Strategy meeting with leadership."
              }
            ]
          }
        }
      }
    }) + "\n"
  );
  await new Promise((r) => setTimeout(r, 500));

  assert.strictEqual(captured.length, 2);
  const clarifyRes = captured[1];
  assert.strictEqual(clarifyRes.id, 2);
  assert.strictEqual(clarifyRes.result.isError, true);
  assert.strictEqual(clarifyRes.result._argguard.status, "CLARIFY_REQUIRED");
  assert.ok(clarifyRes.result._argguard.fields.includes("start_time"));

  proxy.stop();
  clientInput.end();
});

test("enforce mode with RuleChecker: allows grounded parameters", async () => {
  const clientInput = new PassThrough();
  const clientOutput = new PassThrough();

  const proxy = new ProxyServer({
    targetCommand: "node",
    targetArgs: ["fixtures/calendar/server.js"],
    mode: "enforce"
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

  // 1. List tools
  clientInput.write(JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) + "\n");
  await new Promise((r) => setTimeout(r, 400));

  // 2. Call with all grounded parameters
  clientInput.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "create_event",
        arguments: {
          title: "Quarterly Strategy",
          start_time: "2026-11-28T14:00:00"
        },
        _meta: {
          argguard: {
            sources: [
              {
                id: "doc1",
                trust: "user",
                text: "Schedule the Quarterly Strategy for 2026-11-28T14:00:00 now."
              }
            ]
          }
        }
      }
    }) + "\n"
  );
  await new Promise((r) => setTimeout(r, 500));

  assert.strictEqual(captured.length, 2);
  const successRes = captured[1];
  assert.strictEqual(successRes.id, 2);
  assert.strictEqual(successRes.result.isError, false);
  assert.match(successRes.result.content[0].text, /Event created: Quarterly Strategy/);

  proxy.stop();
  clientInput.end();
});
