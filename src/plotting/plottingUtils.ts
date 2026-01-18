import { ExpressionNode } from "../parsing/ast";
import { EvaluatorRegistry, EvaluationContext } from "../eval/registry";
import { Variable } from "../state/types";
import { ReactiveVariableStore } from "../state/variableStore";
import {
  SemanticParsers,
  SemanticValue,
  NumberValue,
  PercentageValue,
  CurrencyValue,
  UnitValue,
  DateValue,
  TimeValue,
  DurationValue,
} from "../types";
import { SmartPadQuantity } from "../units/unitsnetAdapter";
import type { PlotPoint, PlotRange } from "../eval/renderNodes";

export type PlotStatus = "connected" | "disconnected";

export interface PlotComputationResult {
  status: PlotStatus;
  message?: string;
  data?: PlotPoint[];
  domain?: PlotRange;
  view?: PlotRange;
  currentX?: number;
  currentY?: number | null;
}

export interface PlotSettings {
  decimalPlaces: number;
  scientificUpperThreshold?: number;
  scientificLowerThreshold?: number;
  scientificTrimTrailingZeros?: boolean;
  groupThousands?: boolean;
  dateDisplayFormat?: "iso" | "locale";
  dateLocale?: string;
}

export interface PlotComputationInput {
  expressionNode: ExpressionNode;
  xVariable: string;
  variableContext: Map<string, Variable>;
  variableStore: ReactiveVariableStore;
  registry: EvaluatorRegistry;
  settings: PlotSettings;
  domainSpec?: string;
  viewSpec?: string;
  sampleCount?: number;
}

const DEFAULT_SAMPLE_COUNT = 60;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const normalizeRange = (range: PlotRange): PlotRange => {
  if (!Number.isFinite(range.min) || !Number.isFinite(range.max)) {
    return { min: 0, max: 1, raw: range.raw };
  }
  if (range.min === range.max) {
    const delta = range.min === 0 ? 1 : Math.abs(range.min) * 0.1;
    return { min: range.min - delta, max: range.max + delta, raw: range.raw };
  }
  if (range.min > range.max) {
    return { min: range.max, max: range.min, raw: range.raw };
  }
  return range;
};

export const parsePlotRange = (raw?: string): PlotRange | null => {
  if (!raw) return null;
  if (raw.startsWith("@auto")) return null;
  const match = raw.match(
    /^\s*([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*\.\.\s*([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\s*$/
  );
  if (!match) return null;
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return normalizeRange({ min, max, raw });
};

export const getPlotNumericValue = (value: SemanticValue): number | null => {
  if (value.isNumeric()) {
    return value.getNumericValue();
  }
  const type = value.getType();
  if (type === "date" || type === "time" || type === "duration") {
    return value.getNumericValue();
  }
  return null;
};

const buildSampleValue = (baseValue: SemanticValue, sample: number): SemanticValue => {
  const type = baseValue.getType();
  if (type === "number") {
    return new NumberValue(sample);
  }
  if (type === "percentage") {
    return new PercentageValue(sample * 100);
  }
  if (type === "currency") {
    const symbol = (baseValue as CurrencyValue).getSymbol();
    return new CurrencyValue(symbol, sample);
  }
  if (type === "unit") {
    const unit = (baseValue as UnitValue).getUnit();
    return new UnitValue(SmartPadQuantity.fromValueAndUnit(sample, unit));
  }
  if (type === "date") {
    const baseDate = baseValue as DateValue;
    return DateValue.fromDate(new Date(sample), baseDate.getZone(), baseDate.hasTimeComponent());
  }
  if (type === "time") {
    return new TimeValue(sample, false, 0);
  }
  if (type === "duration") {
    return DurationValue.fromSeconds(sample);
  }
  return new NumberValue(sample);
};

const inferAutoDomain = (value: SemanticValue): PlotRange => {
  const numeric = getPlotNumericValue(value);
  if (numeric === null) {
    return { min: 0, max: 1 };
  }

  const type = value.getType();
  if (type === "percentage") {
    const span = Math.max(0.1, Math.abs(numeric) * 0.8);
    return normalizeRange({
      min: clamp(numeric - span, 0, 1),
      max: clamp(numeric + span, 0, 1),
    });
  }

  if (type === "date") {
    const span = 1000 * 60 * 60 * 24 * 30;
    return normalizeRange({ min: numeric - span, max: numeric + span });
  }

  if (type === "time") {
    const span = 60 * 60;
    return normalizeRange({ min: numeric - span, max: numeric + span });
  }

  const span = Math.max(2, Math.abs(numeric) * 0.8);
  return normalizeRange({ min: numeric - span, max: numeric + span });
};

const buildEvaluationContext = (
  expressionNode: ExpressionNode,
  variableContext: Map<string, Variable>,
  variableStore: ReactiveVariableStore,
  settings: PlotSettings
): EvaluationContext => ({
  variableStore,
  variableContext,
  functionStore: undefined,
  equationStore: undefined,
  lineNumber: expressionNode.line,
  decimalPlaces: settings.decimalPlaces,
  scientificUpperThreshold: settings.scientificUpperThreshold,
  scientificLowerThreshold: settings.scientificLowerThreshold,
  scientificTrimTrailingZeros: settings.scientificTrimTrailingZeros,
  groupThousands: settings.groupThousands,
  dateDisplayFormat: settings.dateDisplayFormat,
  dateLocale: settings.dateLocale,
  functionCallDepth: 0,
});

const evaluateExpressionAt = (
  registry: EvaluatorRegistry,
  expressionNode: ExpressionNode,
  variableContext: Map<string, Variable>,
  variableStore: ReactiveVariableStore,
  settings: PlotSettings
): number | null => {
  const context = buildEvaluationContext(expressionNode, variableContext, variableStore, settings);
  const renderNode = registry.evaluate(expressionNode, context);
  if (!renderNode || renderNode.type === "error") return null;
  const rawResult = (renderNode as any).result ?? "";
  const parsed = SemanticParsers.parse(String(rawResult));
  if (!parsed) return null;
  return getPlotNumericValue(parsed);
};

const cloneVariableStore = (variableContext: Map<string, Variable>): ReactiveVariableStore => {
  const store = new ReactiveVariableStore();
  variableContext.forEach((variable) => {
    store.setVariableWithMetadata(variable);
  });
  return store;
};

export const computePlotData = (input: PlotComputationInput): PlotComputationResult => {
  const {
    expressionNode,
    xVariable,
    variableContext,
    variableStore,
    registry,
    settings,
    domainSpec,
    viewSpec,
    sampleCount,
  } = input;

  if (!xVariable) {
    return { status: "disconnected", message: "Missing x variable" };
  }

  const baseVariable = variableContext.get(xVariable);
  if (!baseVariable) {
    return { status: "disconnected", message: `Missing variable "${xVariable}"` };
  }

  const baseValue = baseVariable.value;
  const baseNumeric = getPlotNumericValue(baseValue);
  if (baseNumeric === null) {
    return { status: "disconnected", message: `Variable "${xVariable}" is not numeric` };
  }

  const domain = parsePlotRange(domainSpec) ?? inferAutoDomain(baseValue);
  const view = parsePlotRange(viewSpec) ?? domain;
  const normalizedDomain = normalizeRange(domain);
  const normalizedView = normalizeRange(view);

  const totalSamples = Math.max(2, sampleCount ?? DEFAULT_SAMPLE_COUNT);
  const step = (normalizedDomain.max - normalizedDomain.min) / (totalSamples - 1);

  const baseContext = new Map(variableContext);
  const baseStore = cloneVariableStore(baseContext);

  const data: PlotPoint[] = [];
  for (let i = 0; i < totalSamples; i++) {
    const sampleX = normalizedDomain.min + step * i;
    const sampleValue = buildSampleValue(baseValue, sampleX);
    const updatedVariable: Variable = {
      ...baseVariable,
      value: sampleValue,
      rawValue: sampleValue.toString(),
      updatedAt: new Date(),
    };

    const sampleContext = new Map(baseContext);
    sampleContext.set(xVariable, updatedVariable);
    baseStore.setVariableWithMetadata(updatedVariable);

    const yValue = evaluateExpressionAt(
      registry,
      expressionNode,
      sampleContext,
      baseStore,
      settings
    );

    data.push({ x: sampleX, y: yValue });
  }

  const currentY = evaluateExpressionAt(
    registry,
    expressionNode,
    baseContext,
    variableStore,
    settings
  );

  return {
    status: "connected",
    data,
    domain: normalizedDomain,
    view: normalizedView,
    currentX: baseNumeric,
    currentY,
  };
};
