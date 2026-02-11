const REF_PLACEHOLDER_PREFIX = "__sp_ref_";
const REF_PLACEHOLDER_SUFFIX = "__";
const REF_PLACEHOLDER_REGEX = /__sp_ref_[a-z0-9]+__/gi;

const randomChunk = (): string => Math.random().toString(36).slice(2, 8);

export const createReferencePlaceholder = (): string =>
  `${REF_PLACEHOLDER_PREFIX}${Date.now().toString(36)}${randomChunk()}${REF_PLACEHOLDER_SUFFIX}`;

export const isReferencePlaceholder = (value: string): boolean =>
  /^__sp_ref_[a-z0-9]+__$/i.test((value || "").trim());

export const sanitizeReferencePlaceholdersForDisplay = (
  text: string,
  replacement: string = "result"
): string => String(text || "").replace(REF_PLACEHOLDER_REGEX, replacement);

export const createLineId = (): string =>
  `line_${Date.now().toString(36)}_${randomChunk()}`;
