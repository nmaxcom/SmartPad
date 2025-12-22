import { SemanticValue } from '../types';

export interface VariableNode {
  name: string;
  rawValue: string;
  value: SemanticValue | null;
  dependencies: Set<string>;
  dependents: Set<string>;
  isCircular: boolean;
}

interface AddNodeResult {
  success: boolean;
  error?: string;
}

export class DependencyGraph {
  private nodes: Map<string, VariableNode> = new Map();

  private extractDependencies(expression: string): Set<string> {
    // Use the math tokenizer so phrase-based variables (with spaces) are treated as a single identifier
    // This fixes bugs where multi-word variables like "pizza total cost" were split into "pizza", "total", "cost"
    const dependencies = new Set<string>();
    try {
      // Lazy-load to avoid circular deps

      const math = require("../parsing/mathEvaluator") as typeof import("../parsing/mathEvaluator");
      const { tokenize, TokenType } = math;
      const tokens = tokenize(expression);
      for (const token of tokens) {
        if (token.type === TokenType.IDENTIFIER) {
          const name = token.value.trim();
          if (name.length > 0) {
            dependencies.add(name);
          }
        }
      }
      return dependencies;
    } catch {
      // Fallback to legacy best-effort single-word extraction
      const variableRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
      const potentialMatches = expression.match(variableRegex) || [];
      for (const match of potentialMatches) {
        if (!/^\d/.test(match)) {
          dependencies.add(match);
        }
      }
      return dependencies;
    }
  }

  getNode(name: string): VariableNode | undefined {
    return this.nodes.get(name);
  }

  addNode(name: string, rawValue: string): AddNodeResult {
    const normalizedName = name.replace(/\s+/g, " ").trim();
    if (this.nodes.has(normalizedName)) {
      const oldNode = this.nodes.get(normalizedName)!;
      oldNode.dependencies.forEach((depName) => {
        this.nodes.get(depName)?.dependents.delete(normalizedName);
      });
    }

    const dependencies = this.extractDependencies(rawValue);
    const newNode: VariableNode = {
      name: normalizedName,
      rawValue,
      value: null,
      dependencies,
      dependents: new Set(),
      isCircular: false,
    };
    this.nodes.set(normalizedName, newNode);

    dependencies.forEach((depName) => {
      this.nodes.get(depName)?.dependents.add(normalizedName);
    });

    const cycle = this.findCycle(normalizedName);
    if (cycle) {
      const error = `Circular dependency detected: ${cycle.join(" -> ")}`;
      for (const nodeName of cycle) {
        const node = this.nodes.get(nodeName);
        if (node) node.isCircular = true;
      }
      return { success: false, error };
    }

    this.clearCircularFlags(normalizedName);
    return { success: true };
  }

  private findCycle(startNodeName: string): string[] | null {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (currentNodeName: string): string[] | null => {
      visited.add(currentNodeName);
      recursionStack.add(currentNodeName);

      const node = this.nodes.get(currentNodeName);
      if (node) {
        for (const dependencyName of node.dependencies) {
          if (recursionStack.has(dependencyName)) {
            return [dependencyName, currentNodeName];
          }
          if (!visited.has(dependencyName)) {
            const cycle = dfs(dependencyName);
            if (cycle) {
              if (cycle[0] === cycle[cycle.length - 1]) return cycle;

              cycle.unshift(currentNodeName);
              return cycle;
            }
          }
        }
      }
      recursionStack.delete(currentNodeName);
      return null;
    };

    const cycle = dfs(startNodeName);

    if (cycle) {
      const start = cycle[0];
      const path = cycle.reverse().slice(1);
      const startIndex = path.indexOf(start);
      return [start, ...path.slice(startIndex)].reverse();
    }

    return null;
  }

  private clearCircularFlags(startNodeName: string) {
    const nodesToVisit = [startNodeName];
    const visited = new Set<string>();

    while (nodesToVisit.length > 0) {
      const nodeName = nodesToVisit.pop()!;
      if (visited.has(nodeName)) continue;
      visited.add(nodeName);

      const node = this.nodes.get(nodeName);
      if (node) {
        if (!this.findCycle(nodeName)) {
          node.isCircular = false;
        }
        node.dependents.forEach((dep) => nodesToVisit.push(dep));
      }
    }
  }

  getUpdateOrder(): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>(); // For detecting cycles during sort

    const dfs = (nodeName: string) => {
      visited.add(nodeName);
      temp.add(nodeName);

      const node = this.nodes.get(nodeName);
      if (node) {
        // Sort dependencies to ensure a stable output order for tests
        const sortedDependencies = Array.from(node.dependencies).sort();
        for (const depName of sortedDependencies) {
          if (temp.has(depName)) continue; // Skip already in recursion stack
          if (!visited.has(depName)) {
            dfs(depName);
          }
        }
      }

      temp.delete(nodeName);
      order.push(nodeName);
    };

    const sortedKeys = Array.from(this.nodes.keys()).sort();
    for (const nodeName of sortedKeys) {
      if (!visited.has(nodeName)) {
        dfs(nodeName);
      }
    }
    return order;
  }
}
