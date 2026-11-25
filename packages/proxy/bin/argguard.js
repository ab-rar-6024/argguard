#!/usr/bin/env node
import { ProxyServer } from "../src/proxy.js";

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.error("Usage: argguard run [--mode audit|enforce] [--audit <file>] -- <server command...>");
  process.exit(1);
}

let mode = "audit";
let auditFile = "argguard-audit.jsonl";
let cmdIndex = -1;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--mode" && args[i + 1]) {
    mode = args[i + 1];
    i++;
  } else if (args[i] === "--audit" && args[i + 1]) {
    auditFile = args[i + 1];
    i++;
  } else if (args[i] === "--") {
    cmdIndex = i + 1;
    break;
  }
}

if (cmdIndex === -1 || cmdIndex >= args.length) {
  console.error("Error: Server command must be specified after '--'");
  process.exit(1);
}

const targetCommand = args[cmdIndex];
const targetArgs = args.slice(cmdIndex + 1);

const server = new ProxyServer({
  targetCommand,
  targetArgs,
  auditFile,
  mode
});

server.start();

process.on("SIGINT", () => {
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.stop();
  process.exit(0);
});
