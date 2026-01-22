import { defaultUnitRegistry, UnitDefinition } from "./definitions";
import { CompositeUnit, UnitParser } from "./quantity";
import { UnitValue, DurationValue } from "../types";
import type { Variable } from "../state/types";

const UNIT_ALIAS_NAME_RE = /^[A-Za-z°µμΩ]+$/;

const getCompositeUnit = (unitValue: UnitValue): CompositeUnit | null => {
  const quantity = unitValue.getQuantity();
  if (quantity.quantity) return quantity.quantity.unit;
  try {
    return UnitParser.parse(unitValue.getUnit());
  } catch {
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
): Map<string, UnitDefinition> => {
  const aliases = new Map<string, UnitDefinition>();

  variableContext.forEach((variable, name) => {
    if (!UNIT_ALIAS_NAME_RE.test(name)) return;

    let unitValue: UnitValue | null = null;
    if (variable.value instanceof UnitValue) {
      unitValue = variable.value;
    } else if (variable.value instanceof DurationValue) {
      unitValue = UnitValue.fromValueAndUnit(variable.value.getTotalSeconds(), "s");
    }

    if (!unitValue) return;

    const definition = buildAliasDefinition(name, unitValue);
    if (!definition) return;

    aliases.set(name.toLowerCase(), definition);
  });

  return aliases;
};

export const applyDynamicUnitAliases = (variableContext: Map<string, Variable>): void => {
  const aliases = buildDynamicUnitAliases(variableContext);
  defaultUnitRegistry.setDynamicUnits(aliases);
};
