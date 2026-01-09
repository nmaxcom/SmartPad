import { defaultRegistry, setupDefaultEvaluators } from "../src/eval";
import { parseLine } from "../src/parsing/astParser";
import { ReactiveVariableStore } from "../src/state/variableStore";
import { recordEquationFromNode } from "../src/solve/equationStore";

const lines = [
  "xs = 1, 2, 3,",
  "xs => 1, 2, 3",
  "rent = $1250",
  "utilities = $185",
  "internet = $75",
  "subscriptions = $49.99",
  "expenses = rent, utilities, internet, subscriptions",
  "sort(expenses, desc) => $1250, $185, $75, $49.99",
  "max(expenses) => $1250",
  "total = sum(expenses) => $1559.99",
  "expenses / total as % => 80.1295%, 11.8597%, 4.8079%, 3.2028%",
];

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

const results: any[] = [];
for (const raw of lines) {
  context.lineNumber += 1;
  const node = parseLine(raw, context.lineNumber);
  const result = defaultRegistry.evaluate(node, context);
  recordEquationFromNode(node, context.equationStore ?? []);
  sync();
  results.push({ raw, result });
}

console.log(results.map(({ raw, result }, idx) => ({ idx, raw, type: result?.type, display: result?.displayText, value: result && (result as any).result })));
