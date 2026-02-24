require("ts-node/register/transpile-only");

const fs = require("node:fs");
const path = require("node:path");
const { parseLine } = require("../src/parsing/astParser");
const { defaultRegistry } = require("../src/eval");
const { ReactiveVariableStore } = require("../src/state/variableStore");
const { recordEquationFromNode } = require("../src/solve/equationStore");

const createContext = () => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map(),
  functionStore: new Map(),
  equationStore: [],
  lineNumber: 1,
  decimalPlaces: 6,
});

const syncVariables = (context) => {
  context.variableContext.clear();
  context.variableStore.getAllVariables().forEach((variable) => {
    context.variableContext.set(variable.name, variable);
  });
};

const evaluateLine = (line, context, lineNumber) => {
  const node = parseLine(line, lineNumber);
  context.lineNumber = lineNumber;
  const result = defaultRegistry.evaluate(node, context);
  recordEquationFromNode(node, context.equationStore ?? []);
  syncVariables(context);
  return {
    nodeType: node?.type ?? "unknown",
    resultType: result?.type ?? "none",
    resultText: result?.result || result?.displayText || result?.error || "",
  };
};

const suites = [
  {
    name: "lists-and-punctuation",
    setup: [],
    cases: [
      { id: "L1", input: "1,,2=>", title: "double comma inside list literal" },
      { id: "L2", input: "1, ,2=>", title: "blank list element with spaces" },
      { id: "L3", input: "1,2 to =>", title: "missing conversion target after to" },
      { id: "L4", input: "1,2,3 to $ in EUR=>", title: "double conversion suffix chain" },
      { id: "L5", input: "1,2,3,=>", title: "trailing comma in explicit list output" },
      { id: "L6", input: "xs=1,2,3", title: "list assignment compact syntax" },
      { id: "L7", input: "xs where >= 2=>", title: "where filter valid operator" },
      { id: "L8", input: "xs where >== 2=>", title: "where filter malformed operator accepted?" },
      { id: "L9", input: "sum()=>", title: "aggregator called with no arguments" },
      { id: "L10", input: "avg()=>", title: "average called with no arguments" },
      { id: "L11", input: "sum(1,2,3)=>", title: "aggregator with variadic scalar args" },
      { id: "L12", input: "sum((1,2,3))=>", title: "aggregator with tuple-like list arg" },
    ],
  },
  {
    name: "dates-ranges-locale",
    setup: [],
    cases: [
      { id: "D1", input: "2026-01-05..2026-01-01 step 1 day=>", title: "descending date range with positive step" },
      { id: "D2", input: "2026-01-05..2026-01-01 step -1 day=>", title: "descending date range with negative step" },
      { id: "D3", input: "09:00..08:00 step 30 min=>", title: "descending time range with positive step" },
      { id: "D4", input: "09:00..08:00 step -30 min=>", title: "descending time range with negative step" },
      { id: "D5", input: "2026-01-01..2026-01-03 step 25h=>", title: "date step with compact hour unit" },
      { id: "D6", input: "2024-02-30=>", title: "invalid iso date literal normalization" },
      { id: "D7", input: "13/13/2024=>", title: "invalid slash date literal normalization" },
      { id: "D8", input: "06/05/2024=>", title: "slash date locale behavior without explicit locale" },
      { id: "D9", input: "1...5=>", title: "triple-dot typo handling" },
    ],
  },
  {
    name: "math-functions-solver",
    setup: ["f(x)=x^2", "g(x,y=2)=x*y", "distance=v*time"],
    cases: [
      { id: "M1", input: "sqrt 16=>", title: "function call without parentheses" },
      { id: "M2", input: "round(PI,)=>", title: "trailing comma in function args" },
      { id: "M3", input: "g(3,)=>", title: "trailing comma after positional arg with default" },
      { id: "M4", input: "g(y:3, x:2)=>", title: "named args out of order" },
      { id: "M5", input: "g(x:2, z:3)=>", title: "unknown named arg rejection" },
      { id: "M6", input: "solve v in distance = v * time, time=0=>", title: "explicit solve with zero denominator" },
      { id: "M7", input: "time=0", title: "assign scalar zero for time" },
      { id: "M8", input: "distance=10m", title: "assign unit value for distance" },
      { id: "M9", input: "time=0s", title: "assign zero seconds" },
      { id: "M10", input: "v=>", title: "implicit solve with distance and zero time" },
    ],
  },
  {
    name: "units-and-aliases",
    setup: ["ksec=1000s", "speed=9m/s", "m=2"],
    cases: [
      { id: "U1", input: "speed to m/(0 s)=>", title: "conversion target with zero denominator" },
      { id: "U2", input: "speed to m/(1000 s)=>", title: "scaled denominator conversion target" },
      { id: "U3", input: "1ksec to s=>", title: "unit alias conversion (singular)" },
      { id: "U4", input: "2 ksecs to s=>", title: "unit alias conversion (plural)" },
      { id: "U5", input: "1MB/s to Mbit/s=>", title: "data rate conversion bytes to bits" },
      { id: "U6", input: "1Mbps to MB/s=>", title: "data rate conversion bits to bytes" },
      { id: "U7", input: "1N to kg*m/s^2=>", title: "derived-unit conversion target rendering" },
      { id: "U8", input: "2(3m)=>", title: "implicit multiplication with unit in parentheses" },
      { id: "U9", input: "(2m)(3)=>", title: "grouped implicit multiplication unit*scalar" },
      { id: "U10", input: "(2m)(3m)=>", title: "grouped implicit multiplication unit*unit" },
      { id: "U11", input: "m/s=>", title: "alias collision with variable named m" },
    ],
  },
  {
    name: "cross-feature-chaining",
    setup: ["costs=10,20,30 to $", "tax=8%", "r=2m,4m,6m", "f(x)=x*2"],
    cases: [
      { id: "X1", input: "sum(costs where > $15)=>", title: "nested where inside aggregator" },
      { id: "X2", input: "tax on sum(costs)=>", title: "percentage-on over aggregator result" },
      { id: "X3", input: "f(sum(r to cm))=>", title: "nested function + list conversion + sum" },
      { id: "X4", input: "(1..5 to m) to cm=>", title: "parenthesized range annotation then conversion" },
      { id: "X5", input: "(1..5 to m) where > 2m=>", title: "parenthesized range annotation then where filter" },
    ],
  },
];

const runSuite = (suite) => {
  const context = createContext();
  let lineNumber = 1;
  const setupRecords = [];

  for (const line of suite.setup) {
    const evaluated = evaluateLine(line, context, lineNumber++);
    setupRecords.push({
      input: line,
      ...evaluated,
    });
  }

  const caseRecords = suite.cases.map((testCase) => {
    const evaluated = evaluateLine(testCase.input, context, lineNumber++);
    return {
      suite: suite.name,
      id: testCase.id,
      title: testCase.title,
      input: testCase.input,
      ...evaluated,
    };
  });

  return {
    name: suite.name,
    setup: setupRecords,
    cases: caseRecords,
  };
};

const startedAt = new Date().toISOString();
const suiteResults = suites.map(runSuite);
const allCases = suiteResults.flatMap((suite) => suite.cases);
const summaryByType = allCases.reduce((acc, item) => {
  const key = item.resultType;
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

const artifactsDir = path.join(process.cwd(), "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });
const stamp = startedAt.replace(/[:.]/g, "-");
const jsonPath = path.join(artifactsDir, `bug-hunt-sweep-${stamp}.json`);
const mdPath = path.join(artifactsDir, `bug-hunt-sweep-${stamp}.md`);

const payload = {
  startedAt,
  totalSuites: suiteResults.length,
  totalCases: allCases.length,
  summaryByType,
  suites: suiteResults,
};

fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

const mdLines = [];
mdLines.push("# Syntax Bug-Hunt Sweep");
mdLines.push("");
mdLines.push(`- Generated at: ${startedAt}`);
mdLines.push(`- Suites: ${suiteResults.length}`);
mdLines.push(`- Cases: ${allCases.length}`);
mdLines.push(`- Result types: ${JSON.stringify(summaryByType)}`);
mdLines.push("");
for (const suite of suiteResults) {
  mdLines.push(`## ${suite.name}`);
  mdLines.push("");
  if (suite.setup.length > 0) {
    mdLines.push("### Setup");
    mdLines.push("");
    for (const s of suite.setup) {
      mdLines.push(`- \`${s.input}\` -> ${s.resultType}: ${s.resultText || "(empty)"}`);
    }
    mdLines.push("");
  }
  mdLines.push("| ID | Title | Input | Node | Result Type | Output |");
  mdLines.push("|---|---|---|---|---|---|");
  for (const item of suite.cases) {
    const output = (item.resultText || "").replace(/\|/g, "\\|");
    mdLines.push(
      `| ${item.id} | ${item.title} | \`${item.input}\` | ${item.nodeType} | ${item.resultType} | ${output} |`
    );
  }
  mdLines.push("");
}

fs.writeFileSync(mdPath, `${mdLines.join("\n")}\n`, "utf8");

console.log("Syntax bug-hunt sweep complete.");
console.log(`JSON: ${jsonPath}`);
console.log(`Markdown: ${mdPath}`);
