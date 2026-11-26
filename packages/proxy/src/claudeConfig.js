import { readFileSync, writeFileSync, existsSync } from "node:fs";

/**
 * Wraps existing MCP server entries in Claude Desktop configuration with ArgGuard proxy.
 */
export function wrapClaudeDesktopConfig(configPath, options = {}) {
  const mode = options.mode || "enforce";
  if (!existsSync(configPath)) {
    throw new Error(`Claude config file not found at ${configPath}`);
  }

  const raw = readFileSync(configPath, "utf8");
  const config = JSON.parse(raw);
  const mcpServers = config.mcpServers || {};

  const wrappedServers = {};
  for (const [name, srv] of Object.entries(mcpServers)) {
    // Avoid double wrapping
    if (srv.command === "npx" && srv.args?.[0] === "argguard") {
      wrappedServers[name] = srv;
      continue;
    }

    const originalCommand = srv.command;
    const originalArgs = srv.args || [];

    wrappedServers[name] = {
      command: "npx",
      args: [
        "argguard",
        "run",
        "--mode",
        mode,
        "--",
        originalCommand,
        ...originalArgs
      ],
      env: srv.env || {}
    };
  }

  const updatedConfig = { ...config, mcpServers: wrappedServers };
  return updatedConfig;
}
