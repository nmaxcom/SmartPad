const { defaultRegistry, setupDefaultEvaluators } = require("../src/eval");
const { parseLine } = require("../src/parsing/astParser");
const { ReactiveVariableStore } = require("../src/state/variableStore");
const { recordEquationFromNode } = require("../src/solve/equationStore");

const context = {
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map(),
  functionStore: new Map(),
  equationStore: [],
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

const lines = ["a = 10", "b = 20", "vals = a/2, b/4, (a+b)/10", "vals =>"];

for (const raw of lines) {
  const trimmed = raw.trim();
  if (!trimmed) continue;
  context.lineNumber += 1;
  const node = parseLine(raw, context.lineNumber);
  try {
    const result = defaultRegistry.evaluate(node, context);
    console.log(raw, "=>", result && result.type, result && result.result);
  } catch (error) {
    console.error(raw, "error", error instanceof Error ? error.stack : error);
  }
  recordEquationFromNode(node, context.equationStore || []);
  sync();
}
