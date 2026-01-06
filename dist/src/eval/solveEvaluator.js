"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSolveEvaluator = exports.SolveEvaluator = void 0;
const ast_1 = require("../parsing/ast");
const expressionComponents_1 = require("../parsing/expressionComponents");
const expressionParser_1 = require("../parsing/expressionParser");
const equationStore_1 = require("../solve/equationStore");
const types_1 = require("../types");
const expressionEvaluatorV2_1 = require("./expressionEvaluatorV2");
const operatorPrecedence = {
    "^": 3,
    "*": 2,
    "/": 2,
    "+": 1,
    "-": 1,
};
const isSolveExpression = (expr) => /^solve\b/i.test(expr.trim());
const isVariableReferenceExpression = (expr) => /^[a-zA-Z_][a-zA-Z0-9_\s]*$/.test(expr.trim());
const isConstantName = (name) => name === "PI" || name === "E";
const isErrorValue = (value) => value instanceof types_1.ErrorValue;
const findKeywordIndex = (expression, keyword) => {
    const lower = expression.toLowerCase();
    const target = keyword.toLowerCase();
    let depth = 0;
    for (let i = 0; i < lower.length; i++) {
        const char = lower[i];
        if (char === "(")
            depth += 1;
        if (char === ")")
            depth = Math.max(0, depth - 1);
        if (depth > 0)
            continue;
        if (lower.startsWith(target, i)) {
            const before = i === 0 ? "" : lower[i - 1];
            const after = lower[i + target.length] ?? "";
            const beforeOk = !/[a-z0-9_]/.test(before);
            const afterOk = !/[a-z0-9_]/.test(after);
            if (beforeOk && afterOk) {
                return i;
            }
        }
    }
    return null;
};
const splitTopLevelList = (input) => {
    const parts = [];
    let current = "";
    let depth = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (char === "(")
            depth += 1;
        if (char === ")")
            depth = Math.max(0, depth - 1);
        if (char === "," && depth === 0) {
            parts.push(current.trim());
            current = "";
            continue;
        }
        current += char;
    }
    if (current.trim()) {
        parts.push(current.trim());
    }
    return parts;
};
const splitTopLevelEquation = (input) => {
    let depth = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (char === "(")
            depth += 1;
        if (char === ")")
            depth = Math.max(0, depth - 1);
        if (char === "=" && depth === 0) {
            const left = input.slice(0, i).trim();
            const right = input.slice(i + 1).trim();
            if (!left || !right)
                return null;
            return { left, right };
        }
    }
    return null;
};
const parseSolveExpression = (expression) => {
    const trimmed = expression.trim();
    if (!isSolveExpression(trimmed))
        return null;
    const afterSolve = trimmed.replace(/^solve\s+/i, "");
    const inIndex = findKeywordIndex(afterSolve, "in");
    if (inIndex === null) {
        return null;
    }
    const target = afterSolve.slice(0, inIndex).trim();
    if (!target)
        return null;
    const rest = afterSolve.slice(inIndex + 2).trim();
    if (!rest)
        return null;
    const whereIndex = findKeywordIndex(rest, "where");
    const equationSection = (whereIndex === null ? rest : rest.slice(0, whereIndex)).trim();
    const whereClause = whereIndex === null ? undefined : rest.slice(whereIndex + 5).trim();
    if (!equationSection)
        return null;
    if (/,\s*$/.test(equationSection))
        return null;
    const rawEquations = splitTopLevelList(equationSection);
    if (rawEquations.length === 0)
        return null;
    const equations = [];
    for (const raw of rawEquations) {
        if (!raw) {
            return null;
        }
        const eq = splitTopLevelEquation(raw);
        if (!eq) {
            return null;
        }
        equations.push(eq);
    }
    return { target, equations, whereClause };
};
const buildSolveExpression = (components) => {
    const values = [];
    const operators = [];
    let expectValue = true;
    let pendingUnary = null;
    const shouldApplyOperator = (stackOp, currentOp) => {
        const stackPrec = operatorPrecedence[stackOp] ?? 0;
        const currentPrec = operatorPrecedence[currentOp] ?? 0;
        if (stackPrec > currentPrec)
            return true;
        if (stackPrec === currentPrec && currentOp !== "^")
            return true;
        return false;
    };
    const applyOperator = () => {
        const op = operators.pop();
        const right = values.pop();
        const left = values.pop();
        if (!op || !right || !left) {
            return types_1.ErrorValue.semanticError("Invalid expression");
        }
        return { type: "binary", op, left, right };
    };
    for (const component of components) {
        if (component.type === "operator") {
            const op = component.value;
            if (expectValue) {
                if (op === "+" || op === "-") {
                    pendingUnary = op;
                    continue;
                }
                return types_1.ErrorValue.semanticError(`Unexpected operator: "${op}"`);
            }
            while (operators.length > 0 && shouldApplyOperator(operators[operators.length - 1], op)) {
                const applied = applyOperator();
                if (isErrorValue(applied)) {
                    return applied;
                }
                values.push(applied);
            }
            operators.push(op);
            expectValue = true;
            continue;
        }
        let node;
        switch (component.type) {
            case "literal":
                node = {
                    type: "literal",
                    value: component.value,
                    parsed: component.parsedValue ?? types_1.SemanticParsers.parse(component.value) ?? undefined,
                };
                break;
            case "variable":
                node = { type: "variable", name: (0, equationStore_1.normalizeVariableName)(component.value) };
                break;
            case "parentheses":
                if (!component.children || component.children.length === 0) {
                    return types_1.ErrorValue.semanticError("Empty parentheses");
                }
                node = buildSolveExpression(component.children);
                break;
            case "function": {
                const args = [];
                for (const arg of component.args || []) {
                    const built = buildSolveExpression(arg.components);
                    if (isErrorValue(built)) {
                        return built;
                    }
                    args.push(built);
                }
                node = { type: "function", name: component.value, args };
                break;
            }
            default:
                return types_1.ErrorValue.semanticError(`Unsupported component: "${component.type}"`);
        }
        if (isErrorValue(node)) {
            return node;
        }
        let resolvedNode = node;
        if (pendingUnary) {
            resolvedNode = { type: "unary", op: pendingUnary, value: resolvedNode };
            pendingUnary = null;
        }
        values.push(resolvedNode);
        expectValue = false;
    }
    if (pendingUnary) {
        return types_1.ErrorValue.semanticError("Dangling unary operator");
    }
    while (operators.length > 0) {
        const applied = applyOperator();
        if (isErrorValue(applied)) {
            return applied;
        }
        values.push(applied);
    }
    if (values.length !== 1) {
        return types_1.ErrorValue.semanticError("Invalid expression");
    }
    return values[0];
};
const countTarget = (expr, target) => {
    const normalized = (0, equationStore_1.normalizeVariableName)(target);
    switch (expr.type) {
        case "variable":
            return (0, equationStore_1.normalizeVariableName)(expr.name) === normalized ? 1 : 0;
        case "binary":
            return countTarget(expr.left, target) + countTarget(expr.right, target);
        case "unary":
            return countTarget(expr.value, target);
        case "function":
            return expr.args.reduce((sum, arg) => sum + countTarget(arg, target), 0);
        default:
            return 0;
    }
};
const containsTarget = (expr, target) => countTarget(expr, target) > 0;
const formatSolveExpression = (expr, parentOp = null, isRight = false) => {
    const wrapIfNeeded = (value) => value.startsWith("(") && value.endsWith(")") ? value : `(${value})`;
    switch (expr.type) {
        case "literal": {
            const match = expr.value.match(/^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)([a-zA-Z°µμΩ].*)$/i);
            if (match) {
                return `${match[1]} ${match[2]}`;
            }
            return expr.value;
        }
        case "variable":
            return expr.name;
        case "function":
            return `${expr.name}(${expr.args.map((arg) => formatSolveExpression(arg)).join(", ")})`;
        case "unary": {
            const child = formatSolveExpression(expr.value, "u");
            const needsParens = expr.value.type === "binary";
            return `${expr.op}${needsParens ? `(${child})` : child}`;
        }
        case "binary": {
            const prec = operatorPrecedence[expr.op] ?? 0;
            const parentPrec = parentOp ? operatorPrecedence[parentOp] ?? 0 : 0;
            const leftStr = formatSolveExpression(expr.left, expr.op, false);
            const rightStr = formatSolveExpression(expr.right, expr.op, true);
            const leftNeeds = expr.left.type === "binary" &&
                ((operatorPrecedence[expr.left.op] ?? 0) < prec || (expr.op === "^" && (operatorPrecedence[expr.left.op] ?? 0) === prec));
            const rightPrec = expr.right.type === "binary" ? (operatorPrecedence[expr.right.op] ?? 0) : 0;
            const rightNeeds = expr.right.type === "binary" &&
                (rightPrec < prec || (rightPrec === prec && (expr.op === "-" || expr.op === "/" || expr.op === "^")));
            const left = leftNeeds ? wrapIfNeeded(leftStr) : leftStr;
            const right = rightNeeds ? wrapIfNeeded(rightStr) : rightStr;
            const formatted = `${left} ${expr.op} ${right}`;
            if (!parentOp)
                return formatted;
            if (prec < parentPrec)
                return wrapIfNeeded(formatted);
            if (prec === parentPrec && isRight && (parentOp === "-" || parentOp === "/")) {
                return wrapIfNeeded(formatted);
            }
            return formatted;
        }
        default:
            return "";
    }
};
const makeBinary = (op, left, right) => ({
    type: "binary",
    op,
    left,
    right,
});
const makeUnary = (op, value) => ({
    type: "unary",
    op,
    value,
});
const extractNumericLiteral = (expr) => {
    if (expr.type !== "literal")
        return null;
    const parsed = expr.parsed ?? types_1.SemanticParsers.parse(expr.value);
    if (!parsed || parsed.getType() !== "number")
        return null;
    return parsed.getNumericValue();
};
const solveForTarget = (expr, target, other) => {
    if (expr.type === "variable") {
        if ((0, equationStore_1.normalizeVariableName)(expr.name) === (0, equationStore_1.normalizeVariableName)(target)) {
            return other;
        }
        return types_1.ErrorValue.semanticError(`Cannot solve: expected ${target}`);
    }
    if (expr.type === "unary") {
        if (expr.op === "+") {
            return solveForTarget(expr.value, target, other);
        }
        if (expr.op === "-") {
            return solveForTarget(expr.value, target, makeUnary("-", other));
        }
    }
    if (expr.type === "function") {
        return types_1.ErrorValue.semanticError("Cannot solve: unsupported function");
    }
    if (expr.type !== "binary") {
        return types_1.ErrorValue.semanticError("Cannot solve: unsupported expression");
    }
    const leftHas = containsTarget(expr.left, target);
    const rightHas = containsTarget(expr.right, target);
    if (leftHas && rightHas) {
        return types_1.ErrorValue.semanticError("Cannot solve: variable appears on both sides");
    }
    if (!leftHas && !rightHas) {
        return types_1.ErrorValue.semanticError("Cannot solve: variable not found");
    }
    const op = expr.op;
    if (leftHas) {
        switch (op) {
            case "+":
                return solveForTarget(expr.left, target, makeBinary("-", other, expr.right));
            case "-":
                return solveForTarget(expr.left, target, makeBinary("+", other, expr.right));
            case "*":
                return solveForTarget(expr.left, target, makeBinary("/", other, expr.right));
            case "/":
                return solveForTarget(expr.left, target, makeBinary("*", other, expr.right));
            case "^": {
                const exponent = extractNumericLiteral(expr.right);
                if (exponent === null) {
                    return types_1.ErrorValue.semanticError("Cannot solve: exponent must be numeric");
                }
                if (Math.abs(exponent - 2) < 1e-12) {
                    return solveForTarget(expr.left, target, {
                        type: "function",
                        name: "sqrt",
                        args: [other],
                    });
                }
                return solveForTarget(expr.left, target, makeBinary("^", other, makeBinary("/", { type: "literal", value: "1" }, { type: "literal", value: String(exponent) })));
            }
            default:
                return types_1.ErrorValue.semanticError("Cannot solve: unsupported operator");
        }
    }
    switch (op) {
        case "+":
            return solveForTarget(expr.right, target, makeBinary("-", other, expr.left));
        case "-":
            return solveForTarget(expr.right, target, makeBinary("-", expr.left, other));
        case "*":
            return solveForTarget(expr.right, target, makeBinary("/", other, expr.left));
        case "/":
            return solveForTarget(expr.right, target, makeBinary("/", expr.left, other));
        case "^": {
            const base = extractNumericLiteral(expr.left);
            if (base === null) {
                return types_1.ErrorValue.semanticError("Cannot solve: exponent requires constant base");
            }
            return solveForTarget(expr.right, target, makeBinary("/", { type: "function", name: "log", args: [other] }, { type: "function", name: "log", args: [{ type: "literal", value: String(base) }] }));
        }
        default:
            return types_1.ErrorValue.semanticError("Cannot solve: unsupported operator");
    }
};
const buildSolveTreeFromExpression = (expression) => {
    try {
        const components = (0, expressionComponents_1.parseExpressionComponents)(expression);
        return buildSolveExpression(components);
    }
    catch (error) {
        return types_1.ErrorValue.semanticError(error instanceof Error ? error.message : String(error));
    }
};
const getEquationCandidates = (target, lineNumber, equations) => {
    for (let i = equations.length - 1; i >= 0; i -= 1) {
        const equation = equations[i];
        if (equation.line >= lineNumber)
            continue;
        if ((0, equationStore_1.normalizeVariableName)(equation.variableName) === (0, equationStore_1.normalizeVariableName)(target)) {
            return equation;
        }
        const parsed = buildSolveTreeFromExpression(equation.expression);
        if (!isErrorValue(parsed) && containsTarget(parsed, target)) {
            return equation;
        }
    }
    return null;
};
const mergeVariableContext = (context, localValues) => {
    const merged = new Map();
    context.variableContext.forEach((variable, key) => {
        if (variable.value.getType() === "symbolic") {
            return;
        }
        merged.set(key, variable);
    });
    for (const [key, value] of localValues.entries()) {
        if (value.getType() === "symbolic") {
            continue;
        }
        merged.set(key, {
            name: key,
            value,
            rawValue: value.toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
    return merged;
};
class SolveEvaluator {
    canHandle(node) {
        if (!(0, ast_1.isExpressionNode)(node))
            return false;
        const expr = node.expression;
        if (isSolveExpression(expr))
            return true;
        return isVariableReferenceExpression(expr);
    }
    evaluate(node, context) {
        if (!(0, ast_1.isExpressionNode)(node))
            return null;
        const exprNode = node;
        const rawExpression = exprNode.expression.trim();
        const conversion = isSolveExpression(rawExpression)
            ? null
            : this.extractConversionSuffix(rawExpression);
        const baseExpression = conversion ? conversion.baseExpression : rawExpression;
        if (isSolveExpression(baseExpression)) {
            return this.evaluateExplicitSolve(exprNode, baseExpression, conversion, context);
        }
        if (!isVariableReferenceExpression(baseExpression)) {
            return null;
        }
        const target = (0, equationStore_1.normalizeVariableName)(baseExpression);
        if (isConstantName(target)) {
            return null;
        }
        if (context.variableContext.has(target)) {
            const existing = context.variableContext.get(target);
            if (existing?.value && existing.value.getType() !== "symbolic") {
                return null;
            }
        }
        return this.evaluateImplicitSolve(exprNode, target, conversion, context);
    }
    evaluateExplicitSolve(node, baseExpression, conversion, context) {
        const parsed = parseSolveExpression(baseExpression);
        if (!parsed) {
            return this.createErrorNode("Cannot solve: equation is not valid", node.expression, context.lineNumber);
        }
        const target = (0, equationStore_1.normalizeVariableName)(parsed.target);
        const localValues = new Map();
        const assignmentEquations = [];
        let targetEquation = null;
        for (const eq of parsed.equations) {
            const leftTree = buildSolveTreeFromExpression(eq.left);
            const rightTree = buildSolveTreeFromExpression(eq.right);
            if (isErrorValue(leftTree) || isErrorValue(rightTree)) {
                return this.createErrorNode("Cannot solve: equation is not valid", node.expression, context.lineNumber);
            }
            const leftHas = containsTarget(leftTree, target);
            const rightHas = containsTarget(rightTree, target);
            if (leftHas || rightHas) {
                if (targetEquation) {
                    return this.createErrorNode("Cannot solve: multiple equations for target", node.expression, context.lineNumber);
                }
                targetEquation = eq;
            }
            else {
                assignmentEquations.push(eq);
            }
        }
        if (!targetEquation) {
            return this.createErrorNode(`Cannot solve: no equation found for "${target}"`, node.expression, context.lineNumber);
        }
        for (const eq of assignmentEquations) {
            const leftTree = buildSolveTreeFromExpression(eq.left);
            if (isErrorValue(leftTree)) {
                return this.createErrorNode("Cannot solve: equation is not valid", node.expression, context.lineNumber);
            }
            const leftExpression = leftTree;
            if (leftExpression.type !== "variable") {
                return this.createErrorNode("Cannot solve: equation is not valid", node.expression, context.lineNumber);
            }
            const leftName = (0, equationStore_1.normalizeVariableName)(leftExpression.name);
            const value = this.evaluateExpression(eq.right, context, localValues);
            if (types_1.SemanticValueTypes.isError(value)) {
                return this.createErrorNode(value.getMessage(), node.expression, context.lineNumber);
            }
            localValues.set(leftName, value);
        }
        const solved = this.solveEquation(targetEquation, target);
        if (isErrorValue(solved)) {
            return this.createErrorNode(solved.getMessage(), node.expression, context.lineNumber);
        }
        return this.formatSolveResult(node, solved, conversion, context, localValues);
    }
    evaluateImplicitSolve(node, target, conversion, context) {
        const equations = context.equationStore ?? [];
        const equation = getEquationCandidates(target, context.lineNumber, equations);
        if (!equation) {
            return this.createErrorNode(`Cannot solve: no equation found for "${target}"`, node.expression, context.lineNumber);
        }
        const solved = this.solveEquation({ left: equation.variableName, right: equation.expression }, target);
        if (isErrorValue(solved)) {
            return this.createErrorNode(solved.getMessage(), node.expression, context.lineNumber);
        }
        return this.formatSolveResult(node, solved, conversion, context, new Map());
    }
    solveEquation(equation, target) {
        const leftTree = buildSolveTreeFromExpression(equation.left);
        const rightTree = buildSolveTreeFromExpression(equation.right);
        if (isErrorValue(leftTree) || isErrorValue(rightTree)) {
            return types_1.ErrorValue.semanticError("Cannot solve: equation is not valid");
        }
        const left = leftTree;
        const right = rightTree;
        const leftHas = containsTarget(left, target);
        const rightHas = containsTarget(right, target);
        if (leftHas && rightHas) {
            return types_1.ErrorValue.semanticError("Cannot solve: variable appears on both sides");
        }
        if (!leftHas && !rightHas) {
            return types_1.ErrorValue.semanticError(`Cannot solve: no equation found for "${target}"`);
        }
        if (leftHas) {
            return solveForTarget(left, target, right);
        }
        return solveForTarget(right, target, left);
    }
    formatSolveResult(node, solved, conversion, context, localValues) {
        const expressionText = formatSolveExpression(solved);
        const displayOptions = this.getDisplayOptions(context);
        const value = this.evaluateExpression(expressionText, context, localValues);
        if (types_1.SemanticValueTypes.isError(value)) {
            return this.createErrorNode(value.getMessage(), node.expression, context.lineNumber);
        }
        let resolved = value;
        if (types_1.SemanticValueTypes.isSymbolic(resolved)) {
            const substituted = this.substituteKnownValues(expressionText, context, localValues, displayOptions);
            const resultText = conversion
                ? `${substituted} ${conversion.keyword} ${conversion.target}`
                : substituted;
            return this.createMathResultNode(node.expression, resultText, context.lineNumber);
        }
        if (conversion) {
            resolved = this.applyUnitConversion(resolved, conversion.target, conversion.keyword);
            if (types_1.SemanticValueTypes.isError(resolved)) {
                return this.createErrorNode(resolved.getMessage(), node.expression, context.lineNumber);
            }
        }
        return this.createMathResultNode(node.expression, resolved.toString(displayOptions), context.lineNumber);
    }
    evaluateExpression(expression, context, localValues) {
        const parsedLiteral = types_1.SemanticParsers.parse(expression.trim());
        if (parsedLiteral && !types_1.SemanticValueTypes.isError(parsedLiteral)) {
            return parsedLiteral;
        }
        const mergedContext = {
            ...context,
            variableContext: mergeVariableContext(context, localValues),
        };
        const components = (0, expressionComponents_1.parseExpressionComponents)(expression);
        const componentResult = expressionEvaluatorV2_1.SimpleExpressionParser.parseComponents(components, mergedContext);
        if (componentResult) {
            return componentResult;
        }
        const arithmeticResult = expressionEvaluatorV2_1.SimpleExpressionParser.parseArithmetic(expression, mergedContext);
        if (arithmeticResult) {
            return arithmeticResult;
        }
        const evalResult = (0, expressionParser_1.parseAndEvaluateExpression)(expression, mergedContext.variableContext);
        if (evalResult.error) {
            return types_1.ErrorValue.semanticError(evalResult.error);
        }
        return types_1.NumberValue.from(evalResult.value);
    }
    substituteKnownValues(expression, context, localValues, displayOptions) {
        const substitutions = new Map();
        const formatValue = (value) => {
            const formatted = value.toString(displayOptions);
            if (/[+\-*/^]/.test(formatted)) {
                return `(${formatted})`;
            }
            return formatted;
        };
        const addValue = (name, value) => {
            if (types_1.SemanticValueTypes.isSymbolic(value) || types_1.SemanticValueTypes.isError(value)) {
                return;
            }
            substitutions.set((0, equationStore_1.normalizeVariableName)(name), formatValue(value));
        };
        context.variableContext.forEach((variable, name) => {
            const value = variable.value;
            if (value) {
                addValue(name, value);
            }
        });
        localValues.forEach((value, name) => {
            addValue(name, value);
        });
        if (substitutions.size === 0) {
            return expression;
        }
        const names = Array.from(substitutions.keys()).sort((a, b) => b.length - a.length);
        const isBoundary = (char) => !char || /[\s+\-*/^%()=<>!,]/.test(char);
        let result = "";
        let pos = 0;
        while (pos < expression.length) {
            let replaced = false;
            for (const name of names) {
                if (!expression.startsWith(name, pos)) {
                    continue;
                }
                const before = pos > 0 ? expression[pos - 1] : undefined;
                const after = pos + name.length < expression.length ? expression[pos + name.length] : undefined;
                if (isBoundary(before) && isBoundary(after)) {
                    result += substitutions.get(name);
                    pos += name.length;
                    replaced = true;
                    break;
                }
            }
            if (!replaced) {
                result += expression[pos];
                pos += 1;
            }
        }
        return result;
    }
    extractConversionSuffix(expression) {
        const match = expression.match(/\b(to|in)\b\s+(.+)$/i);
        if (!match || match.index === undefined) {
            return null;
        }
        const baseExpression = expression.slice(0, match.index).trim();
        if (!baseExpression) {
            return null;
        }
        const target = match[2].trim();
        if (!target) {
            return null;
        }
        return { baseExpression, target, keyword: match[1].toLowerCase() };
    }
    applyUnitConversion(value, target, keyword) {
        const parsed = this.parseConversionTarget(target);
        if (!parsed) {
            return types_1.ErrorValue.semanticError(`Expected unit after '${keyword}'`);
        }
        if (value.getType() === "unit") {
            try {
                return value.convertTo(parsed.unit);
            }
            catch (error) {
                return types_1.ErrorValue.semanticError(error instanceof Error ? error.message : String(error));
            }
        }
        if (value.getType() === "currencyUnit") {
            const currencyValue = value;
            if (parsed.symbol && parsed.symbol !== currencyValue.getSymbol()) {
                return types_1.ErrorValue.semanticError("Cannot convert between different currencies");
            }
            try {
                return currencyValue.convertTo(parsed.unit);
            }
            catch (error) {
                return types_1.ErrorValue.semanticError(error instanceof Error ? error.message : String(error));
            }
        }
        return types_1.ErrorValue.semanticError("Cannot convert non-unit value");
    }
    parseConversionTarget(target) {
        let raw = target.trim();
        if (!raw) {
            return null;
        }
        let symbol;
        const symbolMatch = raw.match(/^([$€£¥₹₿])\s*(.*)$/);
        if (symbolMatch) {
            symbol = symbolMatch[1];
            raw = symbolMatch[2].trim();
        }
        raw = raw.replace(/^per\b/i, "").trim();
        raw = raw.replace(/^[/*]+/, "").trim();
        const unit = raw.replace(/\s+/g, "");
        if (!unit) {
            return null;
        }
        return { unit, symbol };
    }
    createMathResultNode(expression, result, lineNumber) {
        return {
            type: "mathResult",
            expression,
            result,
            displayText: `${expression} => ${result}`,
            line: lineNumber,
            originalRaw: expression,
        };
    }
    createErrorNode(message, expression, lineNumber) {
        return {
            type: "error",
            error: message,
            errorType: "runtime",
            displayText: `${expression} => ⚠️ ${message}`,
            line: lineNumber,
            originalRaw: `${expression} =>`,
        };
    }
    getDisplayOptions(context) {
        return {
            precision: context.decimalPlaces,
            scientificUpperThreshold: context.scientificUpperThreshold,
            scientificLowerThreshold: context.scientificLowerThreshold,
            scientificTrimTrailingZeros: context.scientificTrimTrailingZeros,
            dateFormat: context.dateDisplayFormat,
            dateLocale: context.dateLocale,
        };
    }
}
exports.SolveEvaluator = SolveEvaluator;
exports.defaultSolveEvaluator = new SolveEvaluator();
