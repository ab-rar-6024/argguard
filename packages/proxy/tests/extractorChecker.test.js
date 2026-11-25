import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { ExtractorChecker } from "../src/extractorChecker.js";

test("ExtractorChecker.compare: field-by-field classification", () => {
  const checker = new ExtractorChecker();

  const proposed = {
    title: "Sprint Planning",
    time: "10:00 AM",
    location: "Room 101",
    invented: "Hallucinated Value"
  };

  const extracted = {
    title: "sprint planning",
    time: "10:00 AM",
    location: "Virtual Zoom", // Mismatch!
    invented: null // Unstated!
  };

  const verdicts = checker.compare(proposed, extracted);

  assert.strictEqual(verdicts.title, "GROUNDED");
  assert.strictEqual(verdicts.time, "GROUNDED");
  assert.strictEqual(verdicts.location, "MISMATCH");
  assert.strictEqual(verdicts.invented, "UNSTATED");
});

test("ExtractorChecker: degrades cleanly when service is unavailable", async () => {
  // Point to non-existent server port
  const checker = new ExtractorChecker({
    serviceUrl: "http://127.0.0.1:59999",
    timeoutMs: 300
  });

  const sources = [{ id: "doc1", text: "Some document" }];
  const args = { query: "search" };

  const res = await checker.check(args, sources);
  assert.strictEqual(res.degraded, true);
  assert.strictEqual(res.verdicts, null);
});

test("ExtractorChecker: end-to-end extraction against mock service across 10 cases", async () => {
  // Spin up lightweight mock of extractor service
  const mockServer = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const parsed = JSON.parse(body);
      const text = parsed.text;

      // Simple mock extraction based on presence
      const json_output = {
        name: text.includes("Alice") ? "Alice" : null,
        city: text.includes("Paris") ? "Paris" : text.includes("London") ? "London" : null
      };

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          json_output,
          valid: true,
          status: "ok",
          latency_ms: 5.2
        })
      );
    });
  });

  await new Promise((r) => mockServer.listen(0, r));
  const port = mockServer.address().port;

  const checker = new ExtractorChecker({
    serviceUrl: `http://127.0.0.1:${port}`
  });

  const testCases = [
    { text: "User Alice is in Paris", proposed: { name: "Alice", city: "Paris" }, expectedCity: "GROUNDED" },
    { text: "User Alice has no city listed", proposed: { name: "Alice", city: "Paris" }, expectedCity: "UNSTATED" },
    { text: "User Alice is in London", proposed: { name: "Alice", city: "Paris" }, expectedCity: "MISMATCH" },
    { text: "Bob from Paris", proposed: { name: "Bob", city: "Paris" }, expectedCity: "GROUNDED" },
    { text: "Traveling to Paris today", proposed: { name: null, city: "Paris" }, expectedCity: "GROUNDED" },
    { text: "Meeting Alice tomorrow", proposed: { name: "Alice", city: null }, expectedCity: "UNSTATED" },
    { text: "Alice moved to London", proposed: { name: "Alice", city: "Berlin" }, expectedCity: "MISMATCH" },
    { text: "No details available", proposed: { name: "Charlie", city: "Tokyo" }, expectedCity: "UNSTATED" },
    { text: "Paris flight booked for Alice", proposed: { name: "Alice", city: "Paris" }, expectedCity: "GROUNDED" },
    { text: "Welcome Alice to London!", proposed: { name: "Alice", city: "London" }, expectedCity: "GROUNDED" }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const res = await checker.check(tc.proposed, [{ id: `case-${i}`, text: tc.text }]);
    assert.strictEqual(res.degraded, false);
    assert.strictEqual(res.verdicts.city, tc.expectedCity, `Case ${i} failed`);
    assert.ok(res.latencyMs >= 0);
  }

  mockServer.close();
});
