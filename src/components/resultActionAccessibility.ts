export type ResultMenuNavigationKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

export const buildResultChipAriaLabel = (value: string): string =>
  `Result: ${value}. Press Enter for actions; drag to reuse.`;

export const buildReferenceChipAriaLabel = (label: string): string =>
  `Reference: ${label}. Press Enter to go to its source.`;

export const buildGoalSeekActionLabel = (variable: string): string =>
  `Find ${variable} for a target…`;

export const buildBoundedGoalSeekActionLabel = (variable: string): string =>
  `Find ${variable} within limits…`;

export const resolveResultMenuFocusIndex = (
  key: ResultMenuNavigationKey,
  currentIndex: number,
  itemCount: number,
): number | null => {
  if (itemCount <= 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return itemCount - 1;
  if (key === "ArrowDown") {
    return currentIndex < 0 ? 0 : (currentIndex + 1) % itemCount;
  }
  if (key === "ArrowUp") {
    return currentIndex < 0
      ? itemCount - 1
      : (currentIndex - 1 + itemCount) % itemCount;
  }
  return null;
};
