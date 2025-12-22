export interface VariableAssignment {
  isValid: boolean;
  variableName?: string;
  value?: number; // For backward compatibility - parsed numeric value if applicable
  rawValue?: string; // The raw expression string for new reactive functionality
  expression?: string; // For assignments with =>
  showResult?: boolean; // true if => is present
  error?: string;
}

/**
 * Parses a line of text to determine if it's a valid variable assignment.
 * Supports phrase-based variables with spaces like "my password = 2929".
 *
 * @param line The line of text to parse
 * @returns VariableAssignment object with parsing results
 */
export function parseVariableAssignment(line: string): VariableAssignment {
  // Handle empty lines
  if (!line || line.trim().length === 0) {
    return {
      isValid: false,
      error: "Empty line",
    };
  }

  const trimmedLine = line.trim();

  // Check if line contains an equals sign
  if (!trimmedLine.includes("=")) {
    return {
      isValid: false,
      error: "No assignment operator found",
    };
  }

  // CRITICAL FIX: Reject lines that contain "=>" as they are expression evaluations, not variable assignments
  if (trimmedLine.includes("=>")) {
    return {
      isValid: false,
      error: "Line contains expression evaluation operator (=>), not variable assignment",
    };
  }

  // Split on the first equals sign only
  const equalsIndex = trimmedLine.indexOf("=");
  const leftPart = trimmedLine.substring(0, equalsIndex).trim();
  const rightPart = trimmedLine.substring(equalsIndex + 1).trim();

  // Validate variable name (left side)
  if (!leftPart) {
    return {
      isValid: false,
      error: "Invalid variable name",
    };
  }

  // Variable name validation: must start with letter, contain only letters, numbers, spaces, and underscores
  const variableNameRegex = /^[a-zA-Z][a-zA-Z0-9\s_]*$/;
  if (!variableNameRegex.test(leftPart)) {
    return {
      isValid: false,
      error: "Invalid variable name",
    };
  }

  // Parse the value (right side) - can be numeric or expression
  if (!rightPart) {
    return {
      isValid: false,
      error: "Invalid value",
    };
  }

  // Try to parse as a simple numeric value for backward compatibility
  const trimmedRight = rightPart.trim();
  const rightParts = trimmedRight.split(/\s+/);

  // Check if it's a simple numeric value (backward compatibility mode)
  if (rightParts.length === 1) {
    const singleValue = rightParts[0];
    const numericValue = parseFloat(singleValue);

    // CRITICAL FIX: Only treat as simple numeric if the ENTIRE string is numeric
    // This prevents "4+2" from being parsed as "4"
    // Use a regex to check if the string is purely numeric (including decimals and negative numbers)
    const isNumericOnly = /^-?\d+(\.\d+)?$/.test(singleValue);
    if (!isNaN(numericValue) && isNumericOnly) {
      // Simple numeric assignment - only provide value for backward compatibility
      return {
        isValid: true,
        variableName: leftPart,
        value: numericValue,
      };
    }
  }

  // For everything else (expressions, variable references, etc.), use rawValue
  // This includes:
  // - Variable references: "c = b"
  // - Mathematical expressions: "z = 10 + 2"
  // - Complex expressions: "total = price * (1 + tax)"

  // Only reject if it's clearly trailing text after a simple number
  // Pattern: "variable = 123 some trailing text here"
  if (rightParts.length > 1) {
    const firstPart = rightParts[0];
    const numericValue = parseFloat(firstPart);
    if (!isNaN(numericValue)) {
      // Check if the remaining parts contain mathematical operators OR numbers
      const remainingText = rightParts.slice(1).join(" ");
      const hasOperators = /[+\-*/^()=<>]/.test(remainingText);
      const hasVariableReferences = /[a-zA-Z]/.test(remainingText);
      const hasNumbers = /\d/.test(remainingText);

      // CRITICAL FIX: Also check if the first part ends with an operator
      // This handles cases like "4+ 2" where the split is ["4+", "2"]
      const firstPartEndsWithOperator = /[+\-*/^]$/.test(firstPart);

      if (!hasOperators && !hasVariableReferences && !hasNumbers && !firstPartEndsWithOperator) {
        // This looks like "123 some trailing text" - reject it
        return {
          isValid: false,
          error: "Line contains trailing text after assignment",
        };
      }
    }
  }

  // Additional check: reject obvious prose-like assignments
  // Patterns like "I think my password = 2929 is secure" or "The my calculation = 50 seems wrong"
  if (rightParts.length > 2) {
    const firstPart = rightParts[0];
    const numericValue = parseFloat(firstPart);
    if (!isNaN(numericValue)) {
      // Check if this looks like prose by looking for common prose words
      const remainingText = rightParts.slice(1).join(" ").toLowerCase();
      const proseWords =
        /\b(is|are|was|were|the|a|an|some|seems|wrong|secure|good|bad|maybe|think|very|quite|really)\b/;

      if (proseWords.test(remainingText)) {
        return {
          isValid: false,
          error: "Line contains trailing text after assignment",
        };
      }
    }
  }

  return {
    isValid: true,
    variableName: leftPart,
    rawValue: rightPart,
  };
}

/**
 * Unified parser for variable assignments with optional evaluation display
 * Handles both "var = value" and "var = value =>" patterns
 * Following the principle: assignment is assignment, => is just "show result"
 */
export function parseVariableAssignmentWithOptionalEvaluation(line: string): VariableAssignment {
  const trimmedLine = line.trim();

  // Check if line has => (show result flag)
  const hasShowResult = trimmedLine.includes("=>");

  let assignmentPart = trimmedLine;
  if (hasShowResult) {
    // Extract just the assignment part before =>
    const arrowIndex = trimmedLine.indexOf("=>");
    assignmentPart = trimmedLine.substring(0, arrowIndex).trim();
  }

  // Parse the assignment part using existing logic
  const result = parseVariableAssignment(assignmentPart);

  if (result.isValid && hasShowResult) {
    // Add the show result flag and extract expression
    const equalsIndex = assignmentPart.indexOf("=");
    const expression = assignmentPart.substring(equalsIndex + 1).trim();

    return {
      ...result,
      showResult: true,
      expression: expression,
    };
  }

  return result;
}
