import test from "node:test";
import assert from "node:assert/strict";
import { normalizeText, normalizeNumber, normalizeDate, isGroundableInText } from "../src/normalization.js";
import { RuleChecker } from "../src/ruleChecker.js";
import { PolicyEngine, DEFAULT_POLICY } from "../src/policy.js";

test("normalization: text, numbers, and dates", () => {
  // Case & whitespace
  assert.strictEqual(normalizeText("  Hello\tWorld \n New line "), "hello world new line");

  // Numbers
  assert.strictEqual(normalizeNumber("$1,234.50"), "1234.5");
  assert.strictEqual(normalizeNumber("  99% "), "99");
  assert.strictEqual(normalizeNumber("€ 500 "), "500");

  // Dates
  assert.strictEqual(normalizeDate("2026-11-25T19:00:00Z"), "2026-11-25");
  assert.strictEqual(normalizeDate("11/25/2026"), "2026-11-25");
  assert.strictEqual(normalizeDate("2026-11-25"), "2026-11-25");
});

test("property-based normalization fuzzing", () => {
  const words = ["alpha", "beta", "gamma", "123", "45.67", "$500", "2026-11-25"];
  const whitespaces = [" ", "  ", "\t", "\n", "\r\n"];

  for (let i = 0; i < 50; i++) {
    const w1 = words[Math.floor(Math.random() * words.length)];
    const w2 = words[Math.floor(Math.random() * words.length)];
    const ws = whitespaces[Math.floor(Math.random() * whitespaces.length)];
    const combined = `${ws}${w1}${ws}${w2}${ws}`;

    const normalized = normalizeText(combined);
    // Should contain no raw tab/newlines and be trimmed
    assert.strictEqual(normalized.includes("\n"), false);
    assert.strictEqual(normalized.includes("\t"), false);
    assert.strictEqual(normalized.startsWith(" "), false);
    assert.strictEqual(normalized.endsWith(" "), false);
  }
});

test("isGroundableInText: accurately detects grounded parameters with variations", () => {
  const source = "Please send a payment of $1,250 to alice@example.com before 2026-12-01.";

  // Exact & normalized matches
  assert.strictEqual(isGroundableInText("alice@example.com", source), true);
  assert.strictEqual(isGroundableInText(1250, source), true);
  assert.strictEqual(isGroundableInText("1250", source), true);
  assert.strictEqual(isGroundableInText("2026-12-01", source), true);

  // Ungrounded hallucination
  assert.strictEqual(isGroundableInText("bob@example.com", source), false);
  assert.strictEqual(isGroundableInText(9999, source), false);
  assert.strictEqual(isGroundableInText("2025-01-01", source), false);
});

test("RuleChecker: marks arguments GROUNDED or UNSTATED", () => {
  const checker = new RuleChecker();
  const sources = [
    { id: "email-1", text: "Hi, let's schedule the Quarterly Review on 2026-11-30 in Room 4A." }
  ];

  const args = {
    title: "Quarterly Review",
    start_time: "2026-11-30",
    location: "Room 4A",
    attendee: "missing@domain.com"
  };

  const { verdicts } = checker.check(args, sources);
  assert.strictEqual(verdicts.title, "GROUNDED");
  assert.strictEqual(verdicts.start_time, "GROUNDED");
  assert.strictEqual(verdicts.location, "GROUNDED");
  assert.strictEqual(verdicts.attendee, "UNSTATED");
});

test("PolicyEngine: decision matrix mapping", () => {
  const policy = new PolicyEngine(DEFAULT_POLICY);

  // 1. All grounded -> allow
  const res1 = policy.evaluate("create_event", {
    title: "GROUNDED",
    start_time: "GROUNDED"
  });
  assert.strictEqual(res1.action, "allow");

  // 2. Unstated field -> ask with clarify fields
  const res2 = policy.evaluate("create_event", {
    title: "GROUNDED",
    start_time: "UNSTATED"
  });
  assert.strictEqual(res2.action, "ask");
  assert.deepStrictEqual(res2.clarifyFields, ["start_time"]);

  // 3. Injection suspect -> confirm/block
  const res3 = policy.evaluate("create_event", {
    title: "GROUNDED",
    location: "INJECTION_SUSPECT"
  });
  assert.strictEqual(res3.action, "confirm");

  // 4. High-risk tool with injection -> block
  const highRiskPolicy = new PolicyEngine({
    ...DEFAULT_POLICY,
    tools: { transfer_funds: { risk: "high" } }
  });
  const res4 = highRiskPolicy.evaluate("transfer_funds", {
    amount: "GROUNDED",
    recipient: "INJECTION_SUSPECT"
  });
  assert.strictEqual(res4.action, "block");
});
