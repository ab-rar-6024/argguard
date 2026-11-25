/**
 * Minimal, zero-dependency lightweight JSON schema validator
 * Supporting: type, properties, required, enum, items
 */
export function validateSchema(schema, data) {
  if (!schema || typeof schema !== "object") return { valid: true, errors: [] };
  const errors = [];

  function check(val, s, path = "") {
    if (s.type) {
      if (s.type === "string" && typeof val !== "string") {
        errors.push(`${path || "value"} must be a string (got ${typeof val})`);
      } else if (s.type === "number" && typeof val !== "number") {
        errors.push(`${path || "value"} must be a number (got ${typeof val})`);
      } else if (s.type === "integer" && (!Number.isInteger(val) || typeof val !== "number")) {
        errors.push(`${path || "value"} must be an integer (got ${typeof val})`);
      } else if (s.type === "boolean" && typeof val !== "boolean") {
        errors.push(`${path || "value"} must be a boolean (got ${typeof val})`);
      } else if (s.type === "array" && !Array.isArray(val)) {
        errors.push(`${path || "value"} must be an array (got ${typeof val})`);
      } else if (s.type === "object" && (typeof val !== "object" || val === null || Array.isArray(val))) {
        errors.push(`${path || "value"} must be an object (got ${typeof val})`);
      }
    }

    if (s.enum && Array.isArray(s.enum)) {
      if (!s.enum.includes(val)) {
        errors.push(`${path || "value"} must be one of [${s.enum.join(", ")}] (got ${JSON.stringify(val)})`);
      }
    }

    if (s.type === "object" && typeof val === "object" && val !== null && !Array.isArray(val)) {
      if (Array.isArray(s.required)) {
        for (const req of s.required) {
          if (val[req] === undefined || val[req] === null) {
            errors.push(`${path ? `${path}.${req}` : req} is a required field`);
          }
        }
      }
      if (s.properties && typeof s.properties === "object") {
        for (const [k, propSchema] of Object.entries(s.properties)) {
          if (val[k] !== undefined && val[k] !== null) {
            check(val[k], propSchema, path ? `${path}.${k}` : k);
          }
        }
      }
    }

    if (s.type === "array" && Array.isArray(val) && s.items) {
      val.forEach((item, idx) => check(item, s.items, `${path}[${idx}]`));
    }
  }

  check(data, schema);
  return { valid: errors.length === 0, errors };
}
