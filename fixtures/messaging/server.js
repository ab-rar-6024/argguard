#!/usr/bin/env node
import { createInterface } from "readline";

const tools = [
  {
    name: "send_message",
    description: "Send a direct message or chat message to a user or channel. Use when delivering notifications, alerts, or personal notes.",
    inputSchema: {
      type: "object",
      properties: {
        recipient: {
          type: "string",
          description: "User handle, username, or email address of the recipient"
        },
        body: {
          type: "string",
          description: "Body text or message content to be sent"
        },
        channel: {
          type: "string",
          description: "Optional channel or room name (e.g. #general)"
        },
        urgent: {
          type: "boolean",
          description: "Whether this message should be flagged as high priority"
        }
      },
      required: ["recipient", "body"]
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
        serverInfo: { name: "fixture-messaging", version: "0.1.0" }
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
    if (name === "send_message") {
      const res = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: `Message sent to ${args?.recipient}: ${args?.body}`
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
