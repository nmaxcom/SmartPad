export const findRangeOperatorOutsideString = (expression: string): number => {
  let inSingle = false;
  let inDouble = false;
  for (let idx = 0; idx < expression.length - 1; idx += 1) {
    const char = expression[idx];
    if (char === "\\" && (inSingle || inDouble)) {
      idx += 1;
      continue;
    }
    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && !inDouble && char === "." && expression[idx + 1] === ".") {
      return idx;
    }
  }
  return -1;
};

export const containsRangeOperatorOutsideString = (expression: string): boolean =>
  findRangeOperatorOutsideString(expression) >= 0;

const findKeywordOutsideString = (expression: string, keyword: string): number => {
  let inSingle = false;
  let inDouble = false;
  const lower = expression.toLowerCase();
  const target = keyword.toLowerCase();
  for (let idx = 0; idx < lower.length; idx += 1) {
    const char = lower[idx];
    if (char === "\\" && (inSingle || inDouble)) {
      idx += 1;
      continue;
    }
    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (inSingle || inDouble) {
      continue;
    }
    if (!lower.startsWith(target, idx)) {
      continue;
    }
    const before = lower[idx - 1] ?? "";
    const after = lower[idx + target.length] ?? "";
    if (/[a-z0-9_]/.test(before) || /[a-z0-9_]/.test(after)) {
      continue;
    }
    return idx;
  }
  return -1;
};

export const isValidRangeExpressionCandidate = (expression: string): boolean => {
  const rangeIndex = findRangeOperatorOutsideString(expression);
  if (rangeIndex < 0) {
    return true;
  }

  const left = expression.slice(0, rangeIndex).trim();
  const rightAndStep = expression.slice(rangeIndex + 2).trim();
  if (!left || !rightAndStep) {
    return false;
  }

  const stepIndex = findKeywordOutsideString(rightAndStep, "step");
  const right = (stepIndex >= 0 ? rightAndStep.slice(0, stepIndex) : rightAndStep).trim();
  const stepValue = stepIndex >= 0 ? rightAndStep.slice(stepIndex + 4).trim() : "";

  if (!right) {
    return false;
  }
  if (stepIndex >= 0 && !stepValue) {
    return false;
  }

  if (
    containsRangeOperatorOutsideString(left) ||
    containsRangeOperatorOutsideString(right) ||
    (stepValue && containsRangeOperatorOutsideString(stepValue))
  ) {
    return false;
  }

  return true;
};

export const normalizeRangeErrorMessage = (raw: string, message: string): string => {
  const lower = message.toLowerCase();
  if (lower.includes("range") || lower.includes("duration step")) {
    return message;
  }
  return `Invalid range expression near "${raw}"`;
};
