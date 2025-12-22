/**
 * Dependency Graph Tests
 *
 * Tests dependency tracking and graph operations including:
 * - Dependency addition and removal
 * - Graph traversal and updates
 * - Circular dependency detection
 * - Dependent variable tracking
 */

import { DependencyGraph } from "../../src/state/dependencyGraph";

describe("DependencyGraph", () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  it("should add a node with no dependencies", () => {
    graph.addNode("a", "10");
    expect(graph.getNode("a")).toBeDefined();
    expect(graph.getNode("a")?.dependencies).toEqual(new Set());
  });

  it("should add a node with a single dependency", () => {
    graph.addNode("a", "10");
    graph.addNode("b", "a * 2");
    expect(graph.getNode("b")?.dependencies).toEqual(new Set(["a"]));
    expect(graph.getNode("a")?.dependents).toEqual(new Set(["b"]));
  });

  it("should provide the correct topological sort order", () => {
    graph.addNode("c", "b * 2");
    graph.addNode("a", "10");
    graph.addNode("b", "a + 5");
    const updateOrder = graph.getUpdateOrder();
    // 'a' must be updated before 'b', and 'b' before 'c'.
    expect(updateOrder.indexOf("a")).toBeLessThan(updateOrder.indexOf("b"));
    expect(updateOrder.indexOf("b")).toBeLessThan(updateOrder.indexOf("c"));
  });

  it("should detect a direct circular dependency", () => {
    graph.addNode("a", "b");
    const result = graph.addNode("b", "a");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Circular dependency detected");
    expect(graph.getNode("b")?.isCircular).toBe(true);
  });

  it("should detect an indirect circular dependency", () => {
    graph.addNode("a", "c");
    graph.addNode("b", "a");
    const result = graph.addNode("c", "b");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Circular dependency detected");
    expect(graph.getNode("c")?.isCircular).toBe(true);
  });

  it("should clear circular dependency error when dependency is changed", () => {
    graph.addNode("a", "b");
    graph.addNode("b", "a");

    // Fix the circular dependency
    const result = graph.addNode("b", "10");
    expect(result.success).toBe(true);
    expect(graph.getNode("b")?.isCircular).toBe(false);
    // 'a' should also be cleared of its circular status because the chain is broken
    expect(graph.getNode("a")?.isCircular).toBe(false);
  });

  it("should handle complex dependencies and provide correct update order", () => {
    graph.addNode("d", "a + c");
    graph.addNode("c", "b * 2");
    graph.addNode("a", "10");
    graph.addNode("b", "a + 5");

    const updateOrder = graph.getUpdateOrder();
    expect(updateOrder).toEqual(["a", "b", "c", "d"]);
  });

  it("should correctly update dependencies when a node is redefined", () => {
    graph.addNode("a", "10");
    graph.addNode("b", "a");
    expect(graph.getNode("b")?.dependencies).toEqual(new Set(["a"]));
    expect(graph.getNode("a")?.dependents).toEqual(new Set(["b"]));

    // Redefine 'b' to no longer depend on 'a'
    graph.addNode("b", "20");
    expect(graph.getNode("b")?.dependencies).toEqual(new Set());
    // 'a' should no longer have 'b' as a dependent
    expect(graph.getNode("a")?.dependents).toEqual(new Set());
  });
});
