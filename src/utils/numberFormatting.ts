/**
 * Number formatting helpers shared across SmartPad.
 */

/**
 * Inserts comma thousand separators into a numeric string if it represents
 * a regular decimal/integer value. Scientific notation, infinity, and invalid
 * strings are returned untouched.
 */
export function applyThousandsSeparator(value: string): string {
  if (!value) return value;
  if (value === "Infinity" || value === "-Infinity") return value;
  if (/[eE]/.test(value)) return value;

  let normalized = value;
  let sign = "";
  if (normalized.startsWith("-")) {
    sign = "-";
    normalized = normalized.slice(1);
  }

  const [integerPart, fractionalPart] = normalized.split(".");
  if (!integerPart || !/^\d+$/.test(integerPart)) {
    return value;
  }

  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}${fractionalPart ? `.${fractionalPart}` : ""}`;
}
