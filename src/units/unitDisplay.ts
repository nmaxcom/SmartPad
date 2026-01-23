import { defaultUnitRegistry } from "./definitions";

const pluralizeWord = (word: string): string => {
  if (word.endsWith("y") && !/[aeiou]y$/i.test(word)) {
    return `${word.slice(0, -1)}ies`;
  }
  if (/(s|x|z|ch|sh)$/i.test(word)) {
    return `${word}es`;
  }
  return `${word}s`;
};

const shouldPluralizeUnit = (unit: string, value: number): boolean => {
  if (Math.abs(value) === 1) return false;
  if (!unit) return false;
  return !unit.includes("/") && !unit.includes("^") && !unit.includes("*");
};

export const formatUnitLabel = (unit: string, value: number): string => {
  if (!shouldPluralizeUnit(unit, value)) return unit;

  const def = defaultUnitRegistry.get(unit);
  if (!def) return unit;

  if (def.plural) return def.plural;

  if (def.category === "alias" || def.category === "count") {
    return pluralizeWord(unit);
  }

  if (def.category === "time" && def.symbol === def.name) {
    return pluralizeWord(unit);
  }

  return unit;
};
