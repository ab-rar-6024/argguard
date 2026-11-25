import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { validateSchema } from "./schemaValidator.js";
import { AuditLogger, stripAnsi } from "./audit.js";
import { RuleChecker } from "./ruleChecker.js";
import { PolicyEngine, DEFAULT_POLICY } from "./policy.js";

export class ProxyServer {
  constructor(options = {}) {
    this.targetCommand = options.targetCommand;
    this.targetArgs = options.targetArgs || [];
    this.auditFile = options.auditFile;
    this.mode = options.mode || "audit"; // 'audit' | 'enforce'
    this.timeoutMs = options.timeoutMs || 10000;
    this.maxPayloadBytes = options.maxPayloadBytes || 1024 * 1024; // 1MB default
    this.logger = new AuditLogger(this.auditFile);
    this.ruleChecker = new RuleChecker();
    this.policyEngine = new PolicyEngine(options.policy || DEFAULT_POLICY);
    this.targetProcess = null;
    this.knownTools = new Map();
    this.pendingRequests = new Map();
    this.nextRequestId = 1;
    this.customGroundingHandler = options.groundingHandler || null;
  }

  start(inputStream = process.stdin, outputStream = process.stdout) {
    this.outputStream = outputStream;

    // Spawn child MCP server
    this.targetProcess = spawn(this.targetCommand, this.targetArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false
    });

    this.targetProcess.stderr.on("data", (chunk) => {
      // Forward stderr after stripping terminal escape codes
      const clean = stripAnsi(chunk.toString("utf8"));
      process.stderr.write(clean);
    });

    this.targetProcess.on("exit", (code, signal) => {
      this.rejectAllPending(new Error(`Target MCP process exited (code=${code}, signal=${signal})`));
    });

    // Listen to lines from target
    const targetRl = createInterface({
      input: this.targetProcess.stdout,
      terminal: false
    });

    targetRl.on("line", (line) => {
      this.handleTargetLine(line);
    });

    // Listen to client lines
    const clientRl = createInterface({
      input: inputStream,
      terminal: false
    });

    clientRl.on("line", (line) => {
      this.handleClientLine(line);
    });
  }

  handleTargetLine(line) {
    if (!line.trim()) return;
    if (Buffer.byteLength(line, "utf8") > this.maxPayloadBytes) {
      process.stderr.write("ArgGuard: target payload exceeded max payload cap\n");
      return;
    }

    let msg;
    try {
      msg = JSON.parse(line);
    } catch (err) {
      process.stderr.write("ArgGuard: received invalid JSON from target\n");
      return;
    }

    const { id, result, error } = msg;

    if (id !== undefined && this.pendingRequests.has(id)) {
      const pending = this.pendingRequests.get(id);
      this.pendingRequests.delete(id);
      clearTimeout(pending.timer);

      if (pending.method === "tools/list" && result && Array.isArray(result.tools)) {
        for (const t of result.tools) {
          this.knownTools.set(t.name, t);
        }
      }

      // Log execution to audit log
      if (pending.method === "tools/call") {
        this.logger.log({
          event: "tool_call_completed",
          tool: pending.toolName,
          status: error ? "error" : "success",
          latencyMs: Date.now() - pending.startTime,
          clientRequestId: pending.clientReqId
        });
      }

      // Send response back to client with original client request ID
      const clientRes = { ...msg, id: pending.clientReqId };
      this.sendToClient(clientRes);
    } else {
      // Notification or unmapped message
      this.sendToClient(msg);
    }
  }

  handleClientLine(line) {
    if (!line.trim()) return;
    if (Buffer.byteLength(line, "utf8") > this.maxPayloadBytes) {
      this.sendToClient({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: `ArgGuard: Payload size exceeded limit (${this.maxPayloadBytes} bytes)`
        }
      });
      return;
    }

    let msg;
    try {
      msg = JSON.parse(line);
    } catch (err) {
      this.sendToClient({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32700, message: "ArgGuard: Parse error (invalid JSON)" }
      });
      return;
    }

    const { id, method, params } = msg;

    // Check if tools/call
    if (method === "tools/call") {
      this.interceptToolCall(msg);
      return;
    }

    // Forward non-intercepted requests to target
    this.forwardToTarget(msg);
  }

  interceptToolCall(clientMsg) {
    const { id, params } = clientMsg;
    const toolName = params?.name;
    const args = params?.arguments || {};
    const meta = params?._meta;

    // 1. Check schema validation
    const toolDef = this.knownTools.get(toolName);
    let schemaErrors = [];
    if (toolDef?.inputSchema) {
      const v = validateSchema(toolDef.inputSchema, args);
      if (!v.valid) {
        schemaErrors = v.errors;
      }
    }

    // 2. Extract sources
    const sources = meta?.argguard?.sources || [];
    const hasSources = Array.isArray(sources) && sources.length > 0;

    let verdicts = {};
    let action = "allow";
    let clarifyFields = [];

    if (!hasSources) {
      for (const k of Object.keys(args)) {
        verdicts[k] = "UNCHECKED";
      }
    } else if (this.customGroundingHandler) {
      const res = this.customGroundingHandler({
        toolName,
        args,
        sources,
        toolDef,
        mode: this.mode
      });
      verdicts = res.verdicts;
      action = res.action;
      clarifyFields = res.clarifyFields || [];
    } else {
      // Default to RuleChecker + PolicyEngine
      const checkRes = this.ruleChecker.check(args, sources, toolDef?.inputSchema);
      verdicts = checkRes.verdicts;
      const policyRes = this.policyEngine.evaluate(toolName, verdicts);
      action = policyRes.action;
      clarifyFields = policyRes.clarifyFields;
    }

    // Log audit record
    this.logger.log({
      event: "tool_call_intercepted",
      tool: toolName,
      arguments: args,
      sourcesPresent: hasSources,
      sourcesCount: sources.length,
      schemaValid: schemaErrors.length === 0,
      schemaErrors,
      verdicts,
      actionTaken: action,
      mode: this.mode
    });

    if (this.mode === "enforce") {
      if (schemaErrors.length > 0) {
        this.sendToClient({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: `[ArgGuard Schema Error] Argument schema validation failed:\n${schemaErrors.join("\n")}`
              }
            ],
            isError: true
          }
        });
        return;
      }

      if (action === "ask") {
        this.sendToClient({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: `[ArgGuard Clarify Required] The following argument(s) were unstated or ambiguous in source documents: ${clarifyFields.join(", ")}. Please provide them.`
              }
            ],
            isError: true,
            _argguard: { status: "CLARIFY_REQUIRED", fields: clarifyFields }
          }
        });
        return;
      }

      if (action === "block") {
        this.sendToClient({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: `[ArgGuard Blocked] Tool call blocked by security policy.`
              }
            ],
            isError: true,
            _argguard: { status: "BLOCKED" }
          }
        });
        return;
      }
    }

    // Forward to target
    this.forwardToTarget(clientMsg);
  }

  forwardToTarget(clientMsg) {
    const clientReqId = clientMsg.id;
    if (clientReqId === undefined) {
      // Notification
      if (this.targetProcess && !this.targetProcess.killed) {
        this.targetProcess.stdin.write(JSON.stringify(clientMsg) + "\n");
      }
      return;
    }

    const targetReqId = this.nextRequestId++;
    const targetMsg = { ...clientMsg, id: targetReqId };

    const timer = setTimeout(() => {
      if (this.pendingRequests.has(targetReqId)) {
        this.pendingRequests.delete(targetReqId);
        this.sendToClient({
          jsonrpc: "2.0",
          id: clientReqId,
          error: {
            code: -32000,
            message: `ArgGuard: Target request timed out after ${this.timeoutMs}ms`
          }
        });
      }
    }, this.timeoutMs);

    this.pendingRequests.set(targetReqId, {
      clientReqId,
      method: clientMsg.method,
      toolName: clientMsg.params?.name,
      startTime: Date.now(),
      timer
    });

    if (this.targetProcess && !this.targetProcess.killed) {
      this.targetProcess.stdin.write(JSON.stringify(targetMsg) + "\n");
    }
  }

  sendToClient(msg) {
    if (this.outputStream) {
      this.outputStream.write(JSON.stringify(msg) + "\n");
    }
  }

  rejectAllPending(err) {
    for (const [targetId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      this.sendToClient({
        jsonrpc: "2.0",
        id: pending.clientReqId,
        error: { code: -32603, message: `ArgGuard: ${err.message}` }
      });
    }
    this.pendingRequests.clear();
  }

  stop() {
    if (this.targetProcess && !this.targetProcess.killed) {
      try {
        this.targetProcess.kill();
      } catch (err) {}
    }
  }
}
