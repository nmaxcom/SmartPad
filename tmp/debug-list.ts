import { defaultRegistry, setupDefaultEvaluators } from "../src/eval";
import { parseLine } from "../src/parsing/astParser";
import { ReactiveVariableStore } from "../src/state/variableStore";
import { recordEquationFromNode } from "../src/solve/equationStore";
import { VariableEvaluatorV2 } from "../src/eval/variableEvaluatorV2";

const context = {
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map<string, any>(),
  functionStore: new Map(),
  equationStore: [] as any[],
  lineNumber: 0,
  decimalPlaces: 6,
};

setupDefaultEvaluators();

const sync = () => {
  context.variableContext.clear();
  context.variableStore.getAllVariables().forEach((variable) => {
    context.variableContext.set(variable.name, variable);
  });
};

const evaluateLine = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return;
  context.lineNumber += 1;
  const node = parseLine(raw, context.lineNumber);
  try {
    const result = defaultRegistry.evaluate(node, context);
    console.log(raw, "=>", result?.type, result && (result as any).result);
  } catch (error) {
    console.error(raw, "error", error instanceof Error ? error.stack : error);
  }
  recordEquationFromNode(node, context.equationStore ?? []);
  sync();
};

const initialLines = ["a = 10", "b = 20"];
const remainingLines = ["vals = a/2, b/4, (a+b)/10", "vals =>"];

for (const raw of initialLines) {
  evaluateLine(raw);
}

const variableEvaluator = new VariableEvaluatorV2();
const listValue = (variableEvaluator as any).evaluateListLiteralExpressions(
  "a/2, b/4, (a+b)/10",
  context
);
console.log("list literal helper result:", listValue);

for (const raw of remainingLines) {
  evaluateLine(raw);
}
