#!/usr/bin/env node
import { createInterface } from "readline";

const tools = [
  {
    name: "create_event",
    description: "Schedule a calendar event. Use when booking meetings or appointments with a specific title, start date/time, and optional participants.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Summary or title of the meeting or calendar event"
        },
        start_time: {
          type: "string",
          description: "Start time of the event in ISO 8601 format (YYYY-MM-DDTHH:MM:SS) or date (YYYY-MM-DD)"
        },
        end_time: {
          type: "string",
          description: "End time of the event in ISO 8601 format or date"
        },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "List of attendee email addresses"
        },
        location: {
          type: "string",
          description: "Physical room or virtual link for the event"
        }
      },
      required: ["title", "start_time"]
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
        serverInfo: { name: "fixture-calendar", version: "0.1.0" }
      }
    };
    process.stdout.write(JSON.stringify(res) + "\n");
  } else if (method === "notifications/initialized") {
    // no response required
  } else if (method === "tools/list") {
    const res = {
      jsonrpc: "2.0",
      id,
      result: { tools }
    };
    process.stdout.write(JSON.stringify(res) + "\n");
  } else if (method === "tools/call") {
    const { name, arguments: args } = params || {};
    if (name === "create_event") {
      const res = {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: `Event created: ${args?.title} at ${args?.start_time}`
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
