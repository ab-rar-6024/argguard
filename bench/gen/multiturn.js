import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { BENCH_TOOLS } from "./tools.js";

/**
 * Multi-turn dialog conversational benchmark generator.
 * Tests if models track parameters across user corrections and multi-turn turns.
 */
export function generateMultiTurnDataset() {
  const multiTurnCases = [];

  for (let i = 1; i <= 30; i++) {
    const tool = BENCH_TOOLS[i % BENCH_TOOLS.length];
    const props = Object.keys(tool.inputSchema.properties);

    // Multi-turn dialog sequence:
    // Turn 1: User asks for tool with 1 parameter
    // Turn 2: Assistant asks for missing details
    // Turn 3: User provides missing detail or modifies previous detail
    const p1 = props[0];
    const p2 = props[1] || props[0];

    const turns = [
      { role: "user", text: `I want to invoke ${tool.name} with ${p1} set to val_${p1}_initial.` },
      { role: "assistant", text: `Understood. Please provide ${p2}.` },
      { role: "user", text: `Actually change ${p1} to val_${p1}_final and set ${p2} to val_${p2}_confirmed.` }
    ];

    const groundTruth = {};
    for (const p of props) groundTruth[p] = null;
    groundTruth[p1] = `val_${p1}_final`;
    groundTruth[p2] = `val_${p2}_confirmed`;

    multiTurnCases.push({
      id: `multiturn-${i}`,
      tool: tool.name,
      domain: tool.domain,
      turns,
      source: {
        id: `multiturn-ctx-${i}`,
        trust: "user",
        text: turns.map((t) => `${t.role}: ${t.text}`).join("\n")
      },
      statedFields: [p1, p2],
      groundTruth,
      isInjection: false
    });
  }

  const outPath = join(process.cwd(), "bench/data/multiturn.jsonl");
  writeFileSync(outPath, multiTurnCases.map((c) => JSON.stringify(c)).join("\n") + "\n", "utf8");
  return multiTurnCases;
}

if (process.argv[1]?.endsWith("multiturn.js")) {
  const cases = generateMultiTurnDataset();
  console.log(`Generated ${cases.length} multi-turn benchmark cases to bench/data/multiturn.jsonl`);
}
