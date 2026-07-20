export const DEFAULT_SENSITIVITY_VARIATION = 0.1;

export interface SensitivityCandidate {
  name: string;
  baseInput: number;
}

export interface SensitivityEvaluation {
  numericValue: number;
  displayValue: string;
}

export interface SensitivityImpact {
  name: string;
  baseInput: number;
  minusOutput: SensitivityEvaluation;
  plusOutput: SensitivityEvaluation;
  minusDelta: number;
  plusDelta: number;
  maxAbsDelta: number;
  relativeImpactPercent: number | null;
}

export interface SensitivityAnalysis {
  baseline: SensitivityEvaluation;
  variation: number;
  impacts: SensitivityImpact[];
  failedInputs: string[];
  maxAbsDelta: number;
}

export interface SensitivityBreakEven {
  inputName: string;
  inputFactor: number;
}

export type SensitivityEvaluator = (
  variableName: string,
  inputFactor: number,
) => SensitivityEvaluation | null;

const isFiniteEvaluation = (
  evaluation: SensitivityEvaluation | null,
): evaluation is SensitivityEvaluation =>
  Boolean(evaluation && Number.isFinite(evaluation.numericValue));

export const calculateSensitivity = (options: {
  baseline: SensitivityEvaluation;
  candidates: SensitivityCandidate[];
  evaluate: SensitivityEvaluator;
  variation?: number;
}): SensitivityAnalysis => {
  const variation =
    Number.isFinite(options.variation) && Number(options.variation) > 0
      ? Number(options.variation)
      : DEFAULT_SENSITIVITY_VARIATION;
  const impacts: SensitivityImpact[] = [];
  const failedInputs: string[] = [];

  options.candidates.forEach((candidate) => {
    const minusOutput = options.evaluate(candidate.name, 1 - variation);
    const plusOutput = options.evaluate(candidate.name, 1 + variation);
    if (!isFiniteEvaluation(minusOutput) || !isFiniteEvaluation(plusOutput)) {
      failedInputs.push(candidate.name);
      return;
    }

    const minusDelta = minusOutput.numericValue - options.baseline.numericValue;
    const plusDelta = plusOutput.numericValue - options.baseline.numericValue;
    const maxAbsDelta = Math.max(Math.abs(minusDelta), Math.abs(plusDelta));
    const baselineMagnitude = Math.abs(options.baseline.numericValue);
    impacts.push({
      name: candidate.name,
      baseInput: candidate.baseInput,
      minusOutput,
      plusOutput,
      minusDelta,
      plusDelta,
      maxAbsDelta,
      relativeImpactPercent:
        baselineMagnitude > Number.EPSILON
          ? (maxAbsDelta / baselineMagnitude) * 100
          : null,
    });
  });

  impacts.sort(
    (left, right) =>
      right.maxAbsDelta - left.maxAbsDelta ||
      left.name.localeCompare(right.name),
  );

  return {
    baseline: options.baseline,
    variation,
    impacts,
    failedInputs,
    maxAbsDelta: impacts.reduce(
      (maximum, impact) => Math.max(maximum, impact.maxAbsDelta),
      0,
    ),
  };
};

export const resolveSensitivityBarPercent = (
  delta: number,
  maxAbsDelta: number,
): number => {
  if (
    !Number.isFinite(delta) ||
    !Number.isFinite(maxAbsDelta) ||
    maxAbsDelta <= 0
  ) {
    return 0;
  }
  return Math.min(50, (Math.abs(delta) / maxAbsDelta) * 50);
};

export const buildSensitivityInsight = (
  analysis: SensitivityAnalysis,
  targetName: string,
): string | null => {
  const strongest = analysis.impacts[0];
  if (!strongest) return null;
  const rising = strongest.plusDelta > strongest.minusDelta;
  const direction = rising ? "raises" : "lowers";
  const variationPercent = Math.round(analysis.variation * 100);
  return `${strongest.name} is the strongest local driver: +${variationPercent}% ${direction} ${targetName} to ${strongest.plusOutput.displayValue}.`;
};

export const findSensitivityBreakEven = (options: {
  inputName: string;
  evaluate: (factor: number) => SensitivityEvaluation | null;
  minimumFactor?: number;
  maximumFactor?: number;
  sampleCount?: number;
}): SensitivityBreakEven | null => {
  const minimumFactor = options.minimumFactor ?? 0.1;
  const maximumFactor = options.maximumFactor ?? 2;
  const sampleCount = Math.max(3, Math.round(options.sampleCount ?? 21));
  if (
    !Number.isFinite(minimumFactor) ||
    !Number.isFinite(maximumFactor) ||
    maximumFactor <= minimumFactor
  ) {
    return null;
  }

  let previous: { factor: number; value: number } | null = null;
  for (let index = 0; index < sampleCount; index += 1) {
    const factor =
      minimumFactor +
      ((maximumFactor - minimumFactor) * index) / (sampleCount - 1);
    const evaluation = options.evaluate(factor);
    const value = evaluation?.numericValue;
    if (value === undefined || !Number.isFinite(value)) {
      previous = null;
      continue;
    }
    if (Math.abs(value) <= 1e-9) {
      return { inputName: options.inputName, inputFactor: factor };
    }
    if (previous && Math.sign(previous.value) !== Math.sign(value)) {
      const span = value - previous.value;
      const ratio = Math.abs(span) <= Number.EPSILON ? 0 : -previous.value / span;
      return {
        inputName: options.inputName,
        inputFactor:
          previous.factor + Math.max(0, Math.min(1, ratio)) * (factor - previous.factor),
      };
    }
    previous = { factor, value };
  }
  return null;
};

export const collectLeafSensitivityInputs = (options: {
  targetDependencies: string[];
  dependencyMap: Map<string, string[]>;
  numericVariables: Set<string>;
  excludedVariables?: Set<string>;
}): string[] => {
  const leaves: string[] = [];
  const seenLeaves = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (name: string) => {
    if (!name || visiting.has(name) || visited.has(name)) return;
    visiting.add(name);
    const dependencies = (options.dependencyMap.get(name) || []).filter(
      (dependency) => dependency !== name,
    );
    const expandable = dependencies.filter(
      (dependency) =>
        options.dependencyMap.has(dependency) ||
        options.numericVariables.has(dependency),
    );

    if (expandable.length === 0) {
      if (
        options.numericVariables.has(name) &&
        !options.excludedVariables?.has(name) &&
        !seenLeaves.has(name)
      ) {
        seenLeaves.add(name);
        leaves.push(name);
      }
    } else {
      expandable.forEach(visit);
    }
    visiting.delete(name);
    visited.add(name);
  };

  options.targetDependencies.forEach(visit);
  return leaves;
};
