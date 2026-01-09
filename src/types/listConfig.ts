/**
 * @file List Configuration
 * @description Holds global configuration for list handling such as the maximum
 * allowed length. This is driven off the user settings so the parser and
 * evaluation layers can enforce limits without threading the setting through
 * every call site.
 */

const DEFAULT_LIST_MAX_LENGTH = 100;

let currentListMaxLength = DEFAULT_LIST_MAX_LENGTH;

export function setListMaxLength(value: number): void {
  const safeValue = Math.max(1, Math.floor(value) || DEFAULT_LIST_MAX_LENGTH);
  currentListMaxLength = safeValue;
}

export function getListMaxLength(): number {
  return currentListMaxLength;
}

export { DEFAULT_LIST_MAX_LENGTH };
