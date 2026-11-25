#!/usr/bin/env node
import { createInterface } from "readline";

const tools = [
  {
    name: "update_ticket",
    description: "Update the status, priority, or assignee of an existing support or project ticket. Use when managing incident reports or issue trackers.",
    inputSchema: {
      type: "object",
      properties: {
        ticket_id: {
          type: "string",
          description: "Unique identifier of the ticket (e.g., TICKET-101, BUG-42)"
        },
        status: {
          type: "string",
          enum: ["open", "in_progress", "resolved", "closed"],
          description: "New status of the ticket"
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Priority rating of the ticket"
        },
        assignee: {
          type: "string",
          description: "Username or email of the team member assigned"
        },
        comment: {
          type: "string",
          description: "Internal note or resolution explanation"
        }
      },
      required: ["ticket_id"]
    }
  }
];

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on("line", (line) => {
  if (!line.trim()) return;
  let req;
  try {
    req = JSON.parse(line);
  } catch (err) {
    return;
  }

  const { id, method, params } = req;

  if (method === "initialize") {
    const res = {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "fixture-ticketing", version: "0.1.0" }
      }
    };
    process.stdout.write(JSON.stringify(res) + "\n");
  } else if (method === "notifications/initialized") {
    // no response
  } else if (method === "tools/list") {
    const res = {
      jsonrpc: "2.0",
      id,
      result: { tools }
    };
    process.stdout.write(JSON.stringify(res) + "\n");
  } else if (method === "tools/call") {
    const { name, arguments: args } = params || {};
    if (name === "update_ticket") {
      const res = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: `Ticket ${args?.ticket_id} updated (status: ${args?.status || "unchanged"})`
            }
          ],
          isError: false
        }
      };
      process.stdout.write(JSON.stringify(res) + "\n");
    } else {
      const res = {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Tool not found: ${name}` }
      };
      process.stdout.write(JSON.stringify(res) + "\n");
    }
  } else if (method === "ping") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: {} }) + "\n");
  }
});
