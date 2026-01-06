"use strict";
/**
 * @file Expression Evaluator V2 - Semantic Type Version
 * @description Updated expression evaluator that works with semantic types.
 * Handles simple expressions and delegates complex percentage operations
 * to the percentage evaluator.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultExpressionEvaluatorV2 = exports.ExpressionEvaluatorV2 = exports.SimpleExpressionParser = void 0;
const ast_1 = require("../parsing/ast");
const types_1 = require("../types");
const expressionParser_1 = require("../parsing/expressionParser");
const expressionComponents_1 = require("../parsing/expressionComponents");
/**
 * Simple expression parser for basic arithmetic
 */
class SimpleExpressionParser {
    /**
     * Parse simple arithmetic expressions like "100 + 20" or "$100 * 2"
     */
    static parseArithmetic(expr, context) {
        const trimmed = expr.trim();
        if (/[()]/.test(trimmed) ||
            /\b(sqrt|abs|round|floor|ceil|max|min|sin|cos|tan|log|ln|exp)\s*\(/.test(trimmed)) {
            return null;
        }
        // Handle basic operators
        const operators = ['+', '-', '*', '/', '^'];
        for (const op of operators) {
            const parts = expr.split(op).map(p => p.trim());
            if (parts.length === 2 && parts[0] && parts[1]) {
                const left = this.parseOperand(parts[0], context);
                const right = this.parseOperand(parts[1], context);
                if (types_1.SemanticValueTypes.isError(left) || types_1.SemanticValueTypes.isError(right)) {
                    return left; // Return first error
                }
                return this.performOperation(left, right, op);
            }
        }
        return null;
    }
    /**
     * Parse arithmetic expressions from components (supports chained operators and parentheses)
     */
    static parseComponents(components, context) {
        if (components.length === 0) {
            return null;
        }
        try {
            return this.evaluateComponentList(components, context);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return types_1.ErrorValue.semanticError(message);
        }
    }
    static containsCurrency(components, context) {
        const visit = (items) => {
            for (const component of items) {
                if (component.type === "literal" && component.parsedValue) {
                    if (component.parsedValue.getType() === "currency" || component.parsedValue.getType() === "currencyUnit") {
                        return true;
                    }
                }
                if (component.type === "variable") {
                    const variable = context.variableContext.get(component.value);
                    if (variable?.value instanceof types_1.SemanticValue &&
                        (variable.value.getType() === "currency" || variable.value.getType() === "currencyUnit")) {
                        return true;
                    }
                }
                if (component.type === "function" && component.args) {
                    for (const arg of component.args) {
                        if (visit(arg.components)) {
                            return true;
                        }
                    }
                }
                else if (component.children && component.children.length > 0) {
                    if (visit(component.children)) {
                        return true;
                    }
                }
            }
            return false;
        };
        return visit(components);
    }
    /**
     * Parse an operand (variable, literal, or parenthesized expression)
     */
    static parseOperand(operand, context) {
        const normalized = operand.replace(/\s+/g, " ").trim();
        // Check for variable
        const variable = context.variableContext.get(normalized);
        if (variable) {
            const value = variable.value;
            if (value instanceof types_1.SemanticValue) {
                return value;
            }
            if (typeof value === 'number') {
                return types_1.NumberValue.from(value);
            }
            if (typeof value === 'string') {
                const parsed = types_1.SemanticParsers.parse(value.trim());
                if (parsed) {
                    return parsed;
                }
            }
        }
        // Try to parse as literal
        const parsed = types_1.SemanticParsers.parse(normalized);
        if (parsed) {
            return parsed;
        }
        if (normalized === "PI") {
            return types_1.NumberValue.from(Math.PI);
        }
        if (normalized === "E") {
            return types_1.NumberValue.from(Math.E);
        }
        return types_1.SymbolicValue.from(normalized);
    }
    static wrapExpression(expr) {
        const trimmed = expr.trim();
        if (!/\s|[+\-*/^]/.test(trimmed)) {
            return trimmed;
        }
        return `(${trimmed})`;
    }
    static evaluateComponentList(components, context) {
        const values = [];
        const operators = [];
        const precedence = {
            "^": 3,
            "*": 2,
            "/": 2,
            "+": 1,
            "-": 1,
        };
        const shouldApplyOperator = (stackOp, currentOp) => {
            const stackPrec = precedence[stackOp] ?? 0;
            const currentPrec = precedence[currentOp] ?? 0;
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
            switch (op) {
                case "+":
                    return types_1.SemanticArithmetic.add(left, right);
                case "-":
                    return types_1.SemanticArithmetic.subtract(left, right);
                case "*":
                    return types_1.SemanticArithmetic.multiply(left, right);
                case "/":
                    return types_1.SemanticArithmetic.divide(left, right);
                case "^":
                    if (types_1.SemanticValueTypes.isSymbolic(right)) {
                        const leftExpr = SimpleExpressionParser.wrapExpression(left.toString());
                        const rightExpr = SimpleExpressionParser.wrapExpression(right.toString());
                        return types_1.SymbolicValue.from(`${leftExpr} ^ ${rightExpr}`);
                    }
                    if (!right.isNumeric()) {
                        return types_1.ErrorValue.typeError("Exponent must be numeric", "number", right.getType());
                    }
                    return types_1.SemanticArithmetic.power(left, right.getNumericValue());
                default:
                    return types_1.ErrorValue.semanticError(`Unknown operator: ${op}`);
            }
        };
        let expectValue = true;
        let pendingUnary = null;
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
                while (operators.length > 0 &&
                    shouldApplyOperator(operators[operators.length - 1], op)) {
                    const applied = applyOperator();
                    if (applied && types_1.SemanticValueTypes.isError(applied)) {
                        return applied;
                    }
                    if (applied) {
                        values.push(applied);
                    }
                }
                operators.push(op);
                expectValue = true;
                continue;
            }
            const value = this.resolveComponentValue(component, context);
            if (types_1.SemanticValueTypes.isError(value)) {
                return value;
            }
            let resolved = value;
            if (pendingUnary === "-") {
                resolved = types_1.SemanticArithmetic.multiply(new types_1.NumberValue(-1), resolved);
                if (types_1.SemanticValueTypes.isError(resolved)) {
                    return resolved;
                }
            }
            pendingUnary = null;
            values.push(resolved);
            expectValue = false;
        }
        if (expectValue) {
            return types_1.ErrorValue.semanticError("Expression ended unexpectedly");
        }
        while (operators.length > 0) {
            const applied = applyOperator();
            if (applied && types_1.SemanticValueTypes.isError(applied)) {
                return applied;
            }
            if (applied) {
                values.push(applied);
            }
        }
        if (values.length !== 1) {
            return types_1.ErrorValue.semanticError("Invalid expression");
        }
        return values[0];
    }
    static resolveComponentValue(component, context) {
        switch (component.type) {
            case "literal": {
                if (component.parsedValue) {
                    return component.parsedValue;
                }
                const parsed = types_1.SemanticParsers.parse(component.value);
                return parsed || types_1.ErrorValue.semanticError(`Cannot parse literal: "${component.value}"`);
            }
            case "variable": {
                const variable = context.variableContext.get(component.value);
                if (!variable) {
                    if (component.value === "PI") {
                        return types_1.NumberValue.from(Math.PI);
                    }
                    if (component.value === "E") {
                        return types_1.NumberValue.from(Math.E);
                    }
                    return types_1.SymbolicValue.from(component.value);
                }
                const value = variable.value;
                if (value instanceof types_1.SemanticValue) {
                    return value;
                }
                if (typeof value === "number") {
                    return types_1.NumberValue.from(value);
                }
                if (typeof value === "string") {
                    const parsed = types_1.SemanticParsers.parse(value.trim());
                    if (parsed) {
                        return parsed;
                    }
                }
                return types_1.ErrorValue.semanticError(`Variable "${component.value}" has unsupported type`);
            }
            case "parentheses": {
                if (!component.children || component.children.length === 0) {
                    return types_1.ErrorValue.semanticError("Empty parentheses");
                }
                return this.evaluateComponentList(component.children, context);
            }
            case "function": {
                const args = this.evaluateFunctionArgs(component.args || [], context);
                if (args instanceof types_1.ErrorValue) {
                    return args;
                }
                return this.evaluateFunction(component.value, args, context);
            }
            default:
                return types_1.ErrorValue.semanticError(`Unsupported component: "${component.type}"`);
        }
    }
    static evaluateFunctionArgs(args, context) {
        const positional = [];
        const named = new Map();
        for (const arg of args) {
            const value = this.evaluateComponentList(arg.components, context);
            if (types_1.SemanticValueTypes.isError(value)) {
                return value;
            }
            if (arg.name) {
                named.set(arg.name, value);
            }
            else {
                positional.push(value);
            }
        }
        return { positional, named };
    }
    static evaluateFunction(name, args, context) {
        const builtIn = this.evaluateBuiltInFunction(name, args);
        if (builtIn) {
            return builtIn;
        }
        return this.evaluateUserFunction(name, args, context);
    }
    static evaluateBuiltInFunction(name, args) {
        const funcName = name;
        const builtIns = new Set([
            "sqrt",
            "abs",
            "round",
            "floor",
            "ceil",
            "sin",
            "cos",
            "tan",
            "log",
            "ln",
            "exp",
            "max",
            "min",
        ]);
        if (!builtIns.has(funcName)) {
            return null;
        }
        const hasSymbolic = args.positional.some(types_1.SemanticValueTypes.isSymbolic) ||
            Array.from(args.named.values()).some(types_1.SemanticValueTypes.isSymbolic);
        if (hasSymbolic) {
            const positional = args.positional.map((value) => value.toString());
            const named = Array.from(args.named.entries()).map(([key, value]) => `${key}: ${value.toString()}`);
            return types_1.SymbolicValue.from(`${funcName}(${[...positional, ...named].join(", ")})`);
        }
        if (args.named.size > 0) {
            return types_1.ErrorValue.semanticError(`Named arguments not supported for ${funcName}`);
        }
        const unitArgs = args.positional.filter((value) => value.getType() === "unit");
        const currencyArgs = args.positional.filter((value) => value.getType() === "currency" || value.getType() === "currencyUnit");
        if (unitArgs.length > 0) {
            if (funcName === "sqrt") {
                if (args.positional.length !== 1) {
                    return types_1.ErrorValue.semanticError(`sqrt expects 1 argument, got ${args.positional.length}`);
                }
                const unitValue = args.positional[0];
                const resultQuantity = unitValue.getQuantity().power(0.5);
                return new types_1.UnitValue(resultQuantity);
            }
            return types_1.ErrorValue.semanticError(`Function "${funcName}" does not support unit arguments`);
        }
        if (currencyArgs.length > 0) {
            return types_1.ErrorValue.semanticError(`Function "${funcName}" does not support currency arguments`);
        }
        const numericArgs = args.positional.map((value) => {
            if (!value.isNumeric()) {
                throw new Error(`Function "${funcName}" requires numeric argument, got ${value.getType()}`);
            }
            return value.getNumericValue();
        });
        try {
            switch (funcName) {
                case "sqrt":
                    if (numericArgs.length !== 1) {
                        return types_1.ErrorValue.semanticError(`sqrt expects 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.sqrt(numericArgs[0]));
                case "abs":
                    if (numericArgs.length !== 1) {
                        return types_1.ErrorValue.semanticError(`abs expects 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.abs(numericArgs[0]));
                case "round":
                    if (numericArgs.length !== 1) {
                        return types_1.ErrorValue.semanticError(`round expects 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.round(numericArgs[0]));
                case "floor":
                    if (numericArgs.length !== 1) {
                        return types_1.ErrorValue.semanticError(`floor expects 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.floor(numericArgs[0]));
                case "ceil":
                    if (numericArgs.length !== 1) {
                        return types_1.ErrorValue.semanticError(`ceil expects 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.ceil(numericArgs[0]));
                case "sin":
                    if (numericArgs.length !== 1) {
                        return types_1.ErrorValue.semanticError(`sin expects 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.sin(numericArgs[0]));
                case "cos":
                    if (numericArgs.length !== 1) {
                        return types_1.ErrorValue.semanticError(`cos expects 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.cos(numericArgs[0]));
                case "tan":
                    if (numericArgs.length !== 1) {
                        return types_1.ErrorValue.semanticError(`tan expects 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.tan(numericArgs[0]));
                case "log":
                    if (numericArgs.length !== 1) {
                        return types_1.ErrorValue.semanticError(`log expects 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.log10(numericArgs[0]));
                case "ln":
                    if (numericArgs.length !== 1) {
                        return types_1.ErrorValue.semanticError(`ln expects 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.log(numericArgs[0]));
                case "exp":
                    if (numericArgs.length !== 1) {
                        return types_1.ErrorValue.semanticError(`exp expects 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.exp(numericArgs[0]));
                case "max":
                    if (numericArgs.length < 1) {
                        return types_1.ErrorValue.semanticError(`max expects at least 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.max(...numericArgs));
                case "min":
                    if (numericArgs.length < 1) {
                        return types_1.ErrorValue.semanticError(`min expects at least 1 argument, got ${numericArgs.length}`);
                    }
                    return types_1.NumberValue.from(Math.min(...numericArgs));
                default:
                    return null;
            }
        }
        catch (error) {
            return types_1.ErrorValue.semanticError(error instanceof Error ? error.message : String(error));
        }
    }
    static evaluateUserFunction(name, args, context) {
        const functionStore = context.functionStore ?? new Map();
        const definition = functionStore.get(name);
        if (!definition) {
            return types_1.ErrorValue.semanticError(`Undefined function: ${name}`);
        }
        const nextDepth = (context.functionCallDepth || 0) + 1;
        if (nextDepth > 20) {
            return types_1.ErrorValue.semanticError("Maximum call depth exceeded");
        }
        const boundVariables = new Map(context.variableContext);
        const usedNamed = new Set();
        definition.params.forEach((param, index) => {
            let value = null;
            if (args.named.has(param.name)) {
                value = args.named.get(param.name) || null;
                usedNamed.add(param.name);
            }
            else if (args.positional.length > index) {
                value = args.positional[index];
            }
            else if (param.defaultComponents || param.defaultExpression) {
                const components = param.defaultComponents ||
                    (0, expressionComponents_1.parseExpressionComponents)(param.defaultExpression || "");
                const resolved = this.evaluateComponentList(components, {
                    ...context,
                    variableContext: boundVariables,
                    functionCallDepth: nextDepth,
                });
                if (types_1.SemanticValueTypes.isError(resolved)) {
                    value = resolved;
                }
                else {
                    value = resolved;
                }
            }
            if (!value) {
                value = types_1.ErrorValue.semanticError(`Missing argument: ${param.name}`);
            }
            boundVariables.set(param.name, {
                name: param.name,
                value,
                rawValue: value.toString(),
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        });
        if (args.named.size > usedNamed.size) {
            const unknown = Array.from(args.named.keys()).filter((key) => !usedNamed.has(key));
            return types_1.ErrorValue.semanticError(`Unknown argument: ${unknown[0]}`);
        }
        const result = this.evaluateComponentList(definition.components, {
            ...context,
            variableContext: boundVariables,
            functionCallDepth: nextDepth,
        });
        if (types_1.SemanticValueTypes.isError(result)) {
            const message = result.getMessage();
            return types_1.ErrorValue.semanticError(`Error in ${name}: ${message}`);
        }
        return result;
    }
    /**
     * Perform arithmetic operation between two semantic values
     */
    static performOperation(left, right, operator) {
        switch (operator) {
            case '+':
                return types_1.SemanticArithmetic.add(left, right);
            case '-':
                return types_1.SemanticArithmetic.subtract(left, right);
            case '*':
                return types_1.SemanticArithmetic.multiply(left, right);
            case '/':
                return types_1.SemanticArithmetic.divide(left, right);
            case '^':
                if (types_1.SemanticValueTypes.isSymbolic(right)) {
                    const leftExpr = SimpleExpressionParser.wrapExpression(left.toString());
                    const rightExpr = SimpleExpressionParser.wrapExpression(right.toString());
                    return types_1.SymbolicValue.from(`${leftExpr} ^ ${rightExpr}`);
                }
                if (!right.isNumeric()) {
                    return types_1.ErrorValue.typeError("Exponent must be numeric", 'number', right.getType());
                }
                return types_1.SemanticArithmetic.power(left, right.getNumericValue());
            default:
                return types_1.ErrorValue.semanticError(`Unknown operator: ${operator}`);
        }
    }
}
exports.SimpleExpressionParser = SimpleExpressionParser;
/**
 * Semantic-aware expression evaluator
 * Handles simple arithmetic and delegates complex operations to specialized evaluators
 */
class ExpressionEvaluatorV2 {
    /**
     * Check if this evaluator can handle the node
     * This is a fallback evaluator for simple expressions
     */
    canHandle(node) {
        if (!(0, ast_1.isExpressionNode)(node)) {
            return false;
        }
        const expr = node.expression;
        if (this.containsFunctionCall(expr)) {
            return true;
        }
        // Don't handle percentage expressions - let the percentage evaluator handle those
        if (this.isPercentageExpression(expr)) {
            return false;
        }
        // Handle simple arithmetic expressions
        return (this.isSimpleArithmetic(expr) ||
            this.isSimpleLiteral(expr) ||
            this.isVariableReference(expr));
    }
    /**
     * Evaluate expression using semantic types
     */
    evaluate(node, context) {
        if (!(0, ast_1.isExpressionNode)(node)) {
            return null;
        }
        const exprNode = node;
        const conversion = this.extractConversionSuffix(exprNode.expression);
        const expression = conversion ? conversion.baseExpression : exprNode.expression;
        const components = conversion
            ? (0, expressionComponents_1.parseExpressionComponents)(expression)
            : exprNode.components;
        try {
            let result;
            // Try simple literal first
            if (this.isSimpleLiteral(expression)) {
                result = this.evaluateLiteral(expression);
            }
            // Try variable reference
            else if (this.isVariableReference(expression)) {
                result = this.evaluateVariableReference(expression, context);
            }
            // Function calls or expression components
            else if (this.containsFunctionCall(expression)) {
                const componentResult = SimpleExpressionParser.parseComponents(components, context);
                if (componentResult) {
                    result = componentResult;
                }
                else {
                    result = types_1.ErrorValue.semanticError(`Unsupported expression: "${expression}"`);
                }
            }
            // Try simple arithmetic
            else if (this.isSimpleArithmetic(expression)) {
                const componentResult = components.length > 0
                    ? SimpleExpressionParser.parseComponents(components, context)
                    : null;
                const semanticResult = componentResult || SimpleExpressionParser.parseArithmetic(expression, context);
                if (semanticResult) {
                    result = semanticResult;
                }
                else {
                    const evalResult = (0, expressionParser_1.parseAndEvaluateExpression)(expression, context.variableContext);
                    if (evalResult.error) {
                        result = types_1.ErrorValue.semanticError(evalResult.error);
                    }
                    else {
                        result = types_1.NumberValue.from(evalResult.value);
                    }
                }
            }
            // Fallback
            else {
                result = types_1.ErrorValue.semanticError(`Unsupported expression: "${expression}"`);
            }
            if (conversion) {
                result = this.applyUnitConversion(result, conversion.target, conversion.keyword);
            }
            if (types_1.SemanticValueTypes.isError(result)) {
                return this.createErrorNode(result.getMessage(), exprNode.expression, context.lineNumber);
            }
            // Create render node
            return this.createMathResultNode(exprNode.expression, result, context.lineNumber, this.getDisplayOptions(context));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.createErrorNode(message, exprNode.expression, context.lineNumber);
        }
    }
    /**
     * Check if expression is a percentage expression
     */
    isPercentageExpression(expr) {
        return (/%/.test(expr) ||
            /\bof\b/.test(expr) ||
            /\bon\b/.test(expr) ||
            /\boff\b/.test(expr) ||
            /\bas\s+%/.test(expr));
    }
    /**
     * Check if expression is simple arithmetic
     */
    isSimpleArithmetic(expr) {
        return /[\+\-\*\/\^]/.test(expr);
    }
    /**
     * Check if expression is a simple literal
     */
    isSimpleLiteral(expr) {
        const parsed = types_1.SemanticParsers.parse(expr.trim());
        return parsed !== null && !types_1.SemanticValueTypes.isError(parsed);
    }
    /**
     * Check if expression is a variable reference
     */
    isVariableReference(expr) {
        return /^[a-zA-Z_][a-zA-Z0-9_\s]*$/.test(expr.trim());
    }
    containsFunctionCall(expr) {
        return /[a-zA-Z_][a-zA-Z0-9_\s]*\s*\(/.test(expr);
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
    /**
     * Evaluate a literal expression
     */
    evaluateLiteral(expr) {
        const parsed = types_1.SemanticParsers.parse(expr.trim());
        return parsed || types_1.ErrorValue.parseError(`Cannot parse literal: "${expr}"`);
    }
    /**
     * Evaluate a variable reference
     */
    evaluateVariableReference(expr, context) {
        const normalized = expr.replace(/\s+/g, " ").trim();
        const variable = context.variableContext.get(normalized);
        if (!variable) {
            return types_1.SymbolicValue.from(normalized);
        }
        const value = variable.value;
        if (value instanceof types_1.SemanticValue) {
            return value;
        }
        if (typeof value === "number") {
            return types_1.NumberValue.from(value);
        }
        if (typeof value === "string") {
            const parsed = types_1.SemanticParsers.parse(value.trim());
            if (parsed) {
                return parsed;
            }
        }
        return types_1.ErrorValue.semanticError(`Variable "${normalized}" has unsupported type`);
    }
    /**
     * Create render nodes
     */
    createMathResultNode(expression, result, lineNumber, displayOptions) {
        const resultString = result.toString(displayOptions);
        const displayText = `${expression} => ${resultString}`;
        return {
            type: "mathResult",
            expression,
            result: resultString,
            displayText,
            line: lineNumber,
            originalRaw: expression,
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
    createErrorNode(message, expression, lineNumber) {
        return {
            type: "error",
            error: message,
            errorType: "runtime",
            displayText: `${expression} => ⚠️ ${message}`,
            line: lineNumber,
            originalRaw: expression,
        };
    }
}
exports.ExpressionEvaluatorV2 = ExpressionEvaluatorV2;
exports.defaultExpressionEvaluatorV2 = new ExpressionEvaluatorV2();
