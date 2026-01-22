import { CompositeUnit, UnitComponent, UnitParser } from "../units/quantity";
import { ParsedUnitTarget } from "../units/unitConversionTarget";
import { NumberValue, SemanticValue, UnitValue, UnitValueWithDisplay } from "../types";

const buildUnitString = (components: UnitComponent[]): string => {
  if (components.length === 0) {
    return "";
  }
  const unitString = new CompositeUnit(components).toString();
  return unitString === "1" ? "" : unitString;
};

const splitCompositeUnit = (
  composite: CompositeUnit
): { numerator: string; denominator: string } => {
  const numeratorComponents: UnitComponent[] = [];
  const denominatorComponents: UnitComponent[] = [];

  composite.components.forEach((component) => {
    if (component.power > 0) {
      numeratorComponents.push(component);
    } else if (component.power < 0) {
      denominatorComponents.push({
        unit: component.unit,
        power: Math.abs(component.power),
      });
    }
  });

  return {
    numerator: buildUnitString(numeratorComponents),
    denominator: buildUnitString(denominatorComponents),
  };
};

const getAliasScale = (components: UnitComponent[]): number => {
  return components.reduce((scale, component) => {
    if (component.unit.category !== "alias") {
      return scale;
    }
    return scale * Math.pow(component.unit.baseMultiplier, component.power);
  }, 1);
};

export const attemptPerUnitConversion = (
  value: UnitValue,
  parsed: ParsedUnitTarget
): SemanticValue | null => {
  if (!parsed.unit) {
    return null;
  }

  let targetComposite: CompositeUnit;
  try {
    targetComposite = UnitParser.parse(parsed.unit);
  } catch {
    return null;
  }

  const { numerator, denominator } = splitCompositeUnit(targetComposite);
  if (!denominator || !numerator) {
    return null;
  }

  let valueComposite: CompositeUnit;
  let numeratorComposite: CompositeUnit;
  try {
    valueComposite = UnitParser.parse(value.getUnit());
    numeratorComposite = UnitParser.parse(numerator);
  } catch {
    return null;
  }

  if (!valueComposite.isCompatibleWith(numeratorComposite)) {
    return null;
  }

  let baseValue = value;
  if (value.getUnit() !== numerator) {
    try {
      baseValue = value.convertTo(numerator);
    } catch {
      return null;
    }
  }

  let perValue: SemanticValue;
  try {
    const aliasScale = getAliasScale(
      targetComposite.components.filter((component) => component.power < 0).map((component) => ({
        unit: component.unit,
        power: Math.abs(component.power),
      }))
    );
    const denominatorValue = UnitValue.fromValueAndUnit(
      aliasScale,
      denominator
    );
    perValue = baseValue.divide(denominatorValue);
  } catch {
    return null;
  }

  if (parsed.scale !== 1) {
    if (perValue.getType() === "unit") {
      const numeric = perValue.getNumericValue() / parsed.scale;
      return new UnitValueWithDisplay(perValue as UnitValue, numeric, parsed.displayUnit);
    }
    return new NumberValue(perValue.getNumericValue() / parsed.scale);
  }

  return perValue;
};
