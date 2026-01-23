import { defaultUnitRegistry, UnitDefinition } from "./definitions";
import { CompositeUnit, UnitParser } from "./quantity";
import { UnitValue, DurationValue } from "../types";
import type { Variable } from "../state/types";

const UNIT_ALIAS_NAME_RE = /^[A-Za-z°µμΩ][A-Za-z°µμΩ0-9\s]*$/;
const normalizeAliasKey = (name: string): string => name.trim().toLowerCase();

const getCompositeUnit = (unitValue: UnitValue): CompositeUnit | null => {
  try {
    return UnitParser.parse(unitValue.getUnit());
  } catch {
    const quantity = unitValue.getQuantity();
    if (quantity.quantity) return quantity.quantity.unit;
    return null;
  }
};

const buildAliasDefinition = (name: string, unitValue: UnitValue): UnitDefinition | null => {
  const composite = getCompositeUnit(unitValue);
  if (!composite || composite.isDimensionless()) return null;

  const baseMultiplier = unitValue.getNumericValue() * composite.getBaseConversionFactor();
  if (!Number.isFinite(baseMultiplier) || baseMultiplier === 0) return null;

  return {
    symbol: name,
    name,
    dimension: composite.getDimension(),
    baseMultiplier,
    category: "alias",
  };
};

export const buildDynamicUnitAliases = (
  variableContext: Map<string, Variable>
): { aliases: Map<string, UnitDefinition>; blocked: Map<string, string> } => {
  const aliases = new Map<string, UnitDefinition>();
  const blocked = new Map<string, string>();
  const candidates = new Map<string, { name: string; unitValue: UnitValue }>();

  variableContext.forEach((variable, name) => {
    if (!UNIT_ALIAS_NAME_RE.test(name)) return;

    let unitValue: UnitValue | null = null;
    if (variable.value instanceof UnitValue) {
      unitValue = variable.value;
    } else if (variable.value instanceof DurationValue) {
      unitValue = UnitValue.fromValueAndUnit(variable.value.getTotalSeconds(), "s");
    }

    if (!unitValue) return;
    candidates.set(normalizeAliasKey(name), { name, unitValue });
  });

  const deps = new Map<string, Set<string>>();
  candidates.forEach((candidate, key) => {
    const composite = getCompositeUnit(candidate.unitValue);
    if (!composite) return;
    const used = new Set<string>();
    composite.components.forEach((component) => {
      const symbol = component.unit.symbol;
      const depKey = normalizeAliasKey(symbol);
      if (candidates.has(depKey)) {
        used.add(depKey);
      }
    });
    deps.set(key, used);
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const markCycle = (cycleStart: string) => {
    const startIndex = stack.indexOf(cycleStart);
    if (startIndex === -1) return;
    const cycleKeys = stack.slice(startIndex).concat(cycleStart);
    const cycleNames = cycleKeys.map((key) => candidates.get(key)?.name ?? key);
    const message = `Circular unit alias detected (${cycleNames.join(" -> ")})`;
    cycleKeys.forEach((key) => {
      blocked.set(key, message);
      blocked.set(candidates.get(key)?.name.toLowerCase() ?? key, message);
    });
  };

  const visit = (key: string) => {
    if (visited.has(key) || blocked.has(key)) return;
    if (visiting.has(key)) {
      markCycle(key);
      return;
    }
    visiting.add(key);
    stack.push(key);
    const next = deps.get(key);
    if (next) {
      next.forEach((dep) => visit(dep));
    }
    stack.pop();
    visiting.delete(key);
    visited.add(key);
  };

  candidates.forEach((_candidate, key) => visit(key));

  const built = new Set<string>();
  const buildAlias = (key: string) => {
    if (built.has(key) || blocked.has(key)) return;
    const candidate = candidates.get(key);
    if (!candidate) return;
    const next = deps.get(key);
    if (next) {
      next.forEach((dep) => buildAlias(dep));
    }
    defaultUnitRegistry.setDynamicUnits(aliases, blocked);
    const definition = buildAliasDefinition(candidate.name, candidate.unitValue);
    if (definition) {
      const trimmed = candidate.name.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed === lower) {
        aliases.set(lower, definition);
      } else {
        aliases.set(trimmed, definition);
      }
    }
    built.add(key);
  };

  candidates.forEach((_candidate, key) => buildAlias(key));

  return { aliases, blocked };
};

export const applyDynamicUnitAliases = (variableContext: Map<string, Variable>): void => {
  const { aliases, blocked } = buildDynamicUnitAliases(variableContext);
  defaultUnitRegistry.setDynamicUnits(aliases, blocked);
};
