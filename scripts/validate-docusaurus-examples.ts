import fs from "node:fs";
import path from "node:path";
import { defaultRegistry } from "../src/eval";
import type { EvaluationContext } from "../src/eval";
import { parseLine } from "../src/parsing/astParser";
import { recordEquationFromNode } from "../src/solve/equationStore";
import { ReactiveVariableStore } from "../src/state/variableStore";
import type { Variable } from "../src/state/types";

type PlaygroundExample = {
  file: string;
  title: string;
  code: string;
};

const repoRoot = path.resolve(__dirname, "..");
const docsRoot = path.join(repoRoot, "website", "docs");

const createContext = (): EvaluationContext => ({
  variableStore: new ReactiveVariableStore(),
  variableContext: new Map<string, Variable>(),
  functionStore: new Map(),
  equationStore: [],
  lineNumber: 1,
  decimalPlaces: 6,
});

const syncVariables = (context: EvaluationContext) => {
  context.variableContext.clear();
  context.variableStore.getAllVariables().forEach((variable) => {
    context.variableContext.set(variable.name, variable);
  });
};

const readMarkdownFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return readMarkdownFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
  });

const parseMdxString = (raw: string): string => JSON.parse(raw);

const extractExamples = (): PlaygroundExample[] => {
  const playgroundPattern =
    /<ExamplePlayground\b[^>]*title=\{("(?:(?:\\.|[^"\\])*)")\}[^>]*description=\{("(?:(?:\\.|[^"\\])*)")\}[^>]*code=\{("(?:(?:\\.|[^"\\])*)")\}\s*\/>/gs;

  return readMarkdownFiles(docsRoot).flatMap((file) => {
    const source = fs.readFileSync(file, "utf8");
    return Array.from(source.matchAll(playgroundPattern)).map((match) => ({
      file: path.relative(repoRoot, file),
      title: parseMdxString(match[1]),
      code: parseMdxString(match[3]),
    }));
  });
};

const validateExample = (example: PlaygroundExample): string[] => {
  const context = createContext();

  return example.code.split("\n").flatMap((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return [];
    }

    try {
      const node = parseLine(line, index + 1);
      context.lineNumber = index + 1;
      const result = defaultRegistry.evaluate(node, context);
      recordEquationFromNode(node, context.equationStore ?? []);
      syncVariables(context);

      if (result?.type === "error") {
        return [`${example.file} :: ${example.title} :: line ${index + 1}: ${line} -> ${result.message}`];
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`${example.file} :: ${example.title} :: line ${index + 1}: ${line} -> ${message}`];
    }

    return [];
  });
};

const examples = extractExamples();
const failures = examples.flatMap(validateExample);

if (failures.length > 0) {
  console.error(`Docusaurus example validation failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Validated ${examples.length} Docusaurus interactive examples.`);
