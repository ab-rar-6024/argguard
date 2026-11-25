import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Strips ANSI terminal escape sequences from any string
 */
export function stripAnsi(str) {
  if (typeof str !== "string") return str;
  // Match ANSI escape codes
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

/**
 * Sanitizes an object recursively by stripping ANSI escapes and secret tokens
 */
export function sanitizeData(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === "string") {
    let cleaned = stripAnsi(data);
    // Basic redaction for auth keys / bearer tokens
    cleaned = cleaned.replace(/(bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, "$1[REDACTED]");
    cleaned = cleaned.replace(/(api[_-]?key["']?\s*[:=]\s*["']?)[A-Za-z0-9._~+/-]+/gi, "$1[REDACTED]");
    return cleaned;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  if (typeof data === "object") {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (/key|token|secret|password|auth/i.test(k) && typeof v === "string") {
        out[k] = "[REDACTED]";
      } else {
        out[k] = sanitizeData(v);
      }
    }
    return out;
  }
  return data;
}

export class AuditLogger {
  constructor(filePath) {
    this.filePath = filePath;
    if (this.filePath) {
      mkdirSync(dirname(this.filePath), { recursive: true });
    }
  }

  log(record) {
    if (!this.filePath) return;
    const sanitized = sanitizeData({
      timestamp: new Date().toISOString(),
      ...record
    });
    const line = JSON.stringify(sanitized) + "\n";
    appendFileSync(this.filePath, line, "utf8");
  }
}
