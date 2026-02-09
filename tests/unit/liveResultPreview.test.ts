import {
  getLiveResultMetrics,
  hasUnresolvedLiveIdentifiers,
  isLikelyLiveExpression,
  recordLiveResultEvaluation,
  recordLiveResultRendered,
  recordLiveResultSuppressed,
  resetLiveResultMetrics,
} from "../../src/eval/liveResultPreview";
import { parseLine } from "../../src/parsing/astParser";
import type { Variable } from "../../src/state/types";
import { NumberValue } from "../../src/types";

describe("liveResultPreview helpers", () => {
  beforeEach(() => {
    resetLiveResultMetrics();
  });

  test("detects likely live expressions and ignores plain prose", () => {
    const variableContext = new Map<string, Variable>();
    const functionStore = new Map();

    expect(isLikelyLiveExpression("3*4", variableContext, functionStore)).toBe(true);
    expect(isLikelyLiveExpression("4lb to kg", variableContext, functionStore)).toBe(true);
    expect(isLikelyLiveExpression("buy milk", variableContext, functionStore)).toBe(false);
    expect(isLikelyLiveExpression("x = 4", variableContext, functionStore)).toBe(false);
  });

  test("treats known variable references as likely expressions", () => {
    const variableContext = new Map<string, Variable>([
      [
        "revenue",
        {
          name: "revenue",
          value: NumberValue.from(1200),
          rawValue: "1200",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);
    const functionStore = new Map();

    expect(isLikelyLiveExpression("revenue", variableContext, functionStore)).toBe(true);
  });

  test("detects unresolved identifiers in expression components", () => {
    const unresolvedNode = parseLine("a + b =>", 1);
    expect(unresolvedNode.type).toBe("expression");
    if (unresolvedNode.type !== "expression") {
      throw new Error("Expected expression node");
    }
    expect(hasUnresolvedLiveIdentifiers(unresolvedNode.components, new Map())).toBe(true);

    const resolvedContext = new Map<string, Variable>([
      [
        "a",
        {
          name: "a",
          value: NumberValue.from(1),
          rawValue: "1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      [
        "b",
        {
          name: "b",
          value: NumberValue.from(2),
          rawValue: "2",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);
    expect(hasUnresolvedLiveIdentifiers(unresolvedNode.components, resolvedContext)).toBe(false);
  });

  test("tracks counters and evaluation timing", () => {
    recordLiveResultSuppressed("plaintext");
    recordLiveResultSuppressed("incomplete");
    recordLiveResultSuppressed("error");
    recordLiveResultSuppressed("unresolved");
    recordLiveResultEvaluation(12);
    recordLiveResultEvaluation(8);
    recordLiveResultRendered();

    const metrics = getLiveResultMetrics();
    expect(metrics.live_result_suppressed_plaintext_total).toBe(1);
    expect(metrics.live_result_suppressed_incomplete_total).toBe(1);
    expect(metrics.live_result_suppressed_error_total).toBe(1);
    expect(metrics.live_result_suppressed_unresolved_total).toBe(1);
    expect(metrics.live_result_evaluated_total).toBe(2);
    expect(metrics.live_result_rendered_total).toBe(1);
    expect(metrics.live_result_eval_ms_total).toBe(20);
    expect(metrics.live_result_eval_ms_count).toBe(2);
    expect(metrics.live_result_eval_ms_avg).toBe(10);
  });
});

