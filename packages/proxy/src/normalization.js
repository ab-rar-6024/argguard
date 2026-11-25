/**
 * Normalization utilities for grounding verification
 */

/**
 * Normalizes case and collates whitespace sequences
 */
export function normalizeText(str) {
  if (typeof str !== "string") return String(str ?? "");
  return str
    .toLowerCase()
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Strips formatting from numeric values (e.g. "$1,250.50" -> "1250.50", "42%" -> "42")
 */
export function normalizeNumber(val) {
  if (val === null || val === undefined) return "";
  const s = String(val).trim();
  // Strip currency symbols, commas, percent signs
  const cleaned = s.replace(/[$€£¥₹,%]/g, "").trim();
  const num = Number(cleaned);
  if (!Number.isNaN(num)) {
    // Standardize representation
    return String(num);
  }
  return cleaned;
}

/**
 * Attempts to normalize various date formats to ISO YYYY-MM-DD
 */
export function normalizeDate(val) {
  if (!val) return "";
  const s = String(val).trim();

  // Check already YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // MM/DD/YYYY or DD/MM/YYYY or MM-DD-YYYY
  const slashMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slashMatch) {
    const p1 = slashMatch[1].padStart(2, "0");
    const p2 = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];
    // Return primary YYYY-MM-DD guess
    return `${year}-${p1}-${p2}`;
  }

  // Month names, e.g. "Nov 25, 2026" or "25 November 2026"
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return normalizeText(s);
}

/**
 * Checks if a given needle (primitive, string, number) exists in source text
 * under standard normalizations (exact, case/whitespace folded, number stripped, date standardized).
 */
export function isGroundableInText(needle, haystack) {
  if (needle === null || needle === undefined) return false;
  if (typeof needle === "boolean") {
    // For booleans, look for string representation or truthy words
    const normHaystack = normalizeText(haystack);
    if (needle === true) {
      return normHaystack.includes("true") || normHaystack.includes("yes") || normHaystack.includes("urgent");
    } else {
      return normHaystack.includes("false") || normHaystack.includes("no");
    }
  }

  if (Array.isArray(needle)) {
    // All items must be groundable
    return needle.every((item) => isGroundableInText(item, haystack));
  }

  if (typeof needle === "object") {
    // For objects, every value must be groundable
    return Object.values(needle).every((val) => isGroundableInText(val, haystack));
  }

  const strNeedle = String(needle);
  // 1. Direct inclusion
  if (haystack.includes(strNeedle)) return true;

  // 2. Normalized text inclusion
  const normNeedle = normalizeText(strNeedle);
  const normHaystack = normalizeText(haystack);
  if (normHaystack.includes(normNeedle)) return true;

  // 3. Numeric normalization inclusion
  const numNeedle = normalizeNumber(strNeedle);
  if (numNeedle) {
    if (normHaystack.includes(numNeedle)) return true;
    const haystackWithoutCommas = normHaystack.replace(/,/g, "");
    if (haystackWithoutCommas.includes(numNeedle)) return true;
  }

  // 4. Date normalization
  const dateNeedle = normalizeDate(strNeedle);
  if (dateNeedle) {
    if (normHaystack.includes(dateNeedle)) return true;
    const dateHaystackNorm = normalizeDate(haystack);
    if (dateHaystackNorm && dateHaystackNorm.includes(dateNeedle)) return true;
  }

  return false;
}
