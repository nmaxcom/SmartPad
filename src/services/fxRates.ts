import { CurrencyValue } from "../types/CurrencyValue";

export type FxProvider = "frankfurter" | "ecb" | "fawazahmed0";

export interface FxRatesSnapshot {
  base: string;
  rates: Record<string, number>;
  provider: FxProvider;
  fetchedAt: number;
  sourceDate?: string;
}

export interface FxStatus {
  provider: FxProvider | "offline";
  cryptoProvider?: FxProvider | "offline";
  updatedAt?: number;
  source?: "live" | "cache" | "none";
  stale: boolean;
  lastError?: string;
  providers?: Record<FxProvider, FxProviderStatus>;
}

export interface FxProviderStatus {
  provider: FxProvider;
  updatedAt?: number;
  source: "live" | "cache" | "none";
  stale: boolean;
  lastError?: string;
}

const FX_CACHE_KEY = "smartpad-fx-cache";
const FX_FAWAZ_CACHE_KEY = "smartpad-fx-cache-fawazahmed0";
const FX_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let cachedSnapshot: FxRatesSnapshot | null = null;
let cachedFawazSnapshot: FxRatesSnapshot | null = null;
let status: FxStatus = { provider: "offline", stale: true, source: "none" };
const listeners = new Set<(next: FxStatus) => void>();

const hasStorage = (): boolean => {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
};

const loadCachedSnapshot = (storageKey: string): FxRatesSnapshot | null => {
  if (!hasStorage()) return null;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as FxRatesSnapshot;
    if (!parsed || !parsed.base || !parsed.rates || !parsed.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveCachedSnapshot = (snapshot: FxRatesSnapshot, storageKey: string): void => {
  if (storageKey === FX_FAWAZ_CACHE_KEY) {
    cachedFawazSnapshot = snapshot;
  } else {
    cachedSnapshot = snapshot;
  }
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // ignore storage errors
  }
};

const setStatus = (next: FxStatus): void => {
  status = next;
  listeners.forEach((listener) => listener(status));
};

const isStale = (snapshot: FxRatesSnapshot): boolean => {
  return Date.now() - snapshot.fetchedAt > FX_CACHE_TTL_MS;
};

export const getFxStatus = (): FxStatus => status;

export const subscribeFxStatus = (listener: (next: FxStatus) => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getCachedFxSnapshot = (): FxRatesSnapshot | null => cachedSnapshot;

export const setFxRatesSnapshot = (snapshot: FxRatesSnapshot | null): void => {
  if (!snapshot) {
    cachedSnapshot = null;
    cachedFawazSnapshot = null;
    if (hasStorage()) {
      try {
        window.localStorage.removeItem(FX_CACHE_KEY);
        window.localStorage.removeItem(FX_FAWAZ_CACHE_KEY);
      } catch {
        // ignore
      }
    }
    setStatus(buildStatus(null, "none", null, "none", "FX cache cleared."));
    return;
  }
  if (snapshot.provider === "fawazahmed0") {
    saveCachedSnapshot(snapshot, FX_FAWAZ_CACHE_KEY);
  } else {
    saveCachedSnapshot(snapshot, FX_CACHE_KEY);
  }
  const primarySnapshot = snapshot.provider === "fawazahmed0" ? cachedSnapshot : snapshot;
  const fallbackSnapshot = snapshot.provider === "fawazahmed0" ? snapshot : cachedFawazSnapshot;
  setStatus(
    buildStatus(
      primarySnapshot || null,
      primarySnapshot ? "cache" : "none",
      fallbackSnapshot || null,
      fallbackSnapshot ? "cache" : "none"
    )
  );
};

const buildRatesSnapshot = (
  provider: FxProvider,
  base: string,
  rates: Record<string, number>,
  sourceDate?: string
): FxRatesSnapshot => {
  const normalizedRates: Record<string, number> = {};
  Object.entries(rates).forEach(([code, value]) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    normalizedRates[code.toUpperCase()] = value;
  });
  return {
    provider,
    base: base.toUpperCase(),
    rates: normalizedRates,
    fetchedAt: Date.now(),
    sourceDate,
  };
};

const fetchFrankfurter = async (): Promise<FxRatesSnapshot | null> => {
  const response = await fetch("https://api.frankfurter.app/latest");
  if (!response.ok) return null;
  const data = (await response.json()) as {
    base: string;
    date?: string;
    rates: Record<string, number>;
  };
  if (!data || !data.base || !data.rates) return null;
  return buildRatesSnapshot("frankfurter", data.base, data.rates, data.date);
};

const parseEcbXmlRates = (xmlText: string): { base: string; date?: string; rates: Record<string, number> } | null => {
  if (typeof DOMParser === "undefined") return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const cubeNodes = Array.from(doc.getElementsByTagName("Cube"));
  const rates: Record<string, number> = {};
  let date: string | undefined;
  cubeNodes.forEach((node) => {
    const time = node.getAttribute("time");
    if (time) {
      date = time;
    }
    const currency = node.getAttribute("currency");
    const rate = node.getAttribute("rate");
    if (currency && rate) {
      const value = parseFloat(rate);
      if (Number.isFinite(value)) {
        rates[currency.toUpperCase()] = value;
      }
    }
  });
  if (Object.keys(rates).length === 0) return null;
  return { base: "EUR", date, rates };
};

const fetchEcb = async (): Promise<FxRatesSnapshot | null> => {
  const response = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml");
  if (!response.ok) return null;
  const text = await response.text();
  const parsed = parseEcbXmlRates(text);
  if (!parsed) return null;
  return buildRatesSnapshot("ecb", parsed.base, parsed.rates, parsed.date);
};

const fetchFawazahmed0 = async (): Promise<FxRatesSnapshot | null> => {
  const urls = [
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
    "https://latest.currency-api.pages.dev/v1/currencies/usd.json",
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = (await response.json()) as {
        date?: string;
        usd?: Record<string, number>;
        USD?: Record<string, number>;
      };
      const rates = data?.usd || data?.USD;
      if (!rates) continue;
      return buildRatesSnapshot("fawazahmed0", "USD", rates, data?.date);
    } catch {
      // try next fallback
    }
  }
  return null;
};

const buildProviderStatus = (
  provider: FxProvider,
  snapshot: FxRatesSnapshot | null,
  source: "live" | "cache" | "none",
  lastError?: string
): FxProviderStatus => {
  return {
    provider,
    updatedAt: snapshot?.fetchedAt,
    source,
    stale: snapshot ? isStale(snapshot) : true,
    lastError,
  };
};

const buildStatus = (
  primarySnapshot: FxRatesSnapshot | null,
  primarySource: "live" | "cache" | "none",
  fallbackSnapshot: FxRatesSnapshot | null,
  fallbackSource: "live" | "cache" | "none",
  lastError?: string
): FxStatus => {
  const primaryProvider = primarySnapshot?.provider;
  const provider: FxProvider | "offline" =
    primaryProvider || (fallbackSnapshot ? "fawazahmed0" : "offline");
  const cryptoProvider: FxProvider | "offline" = fallbackSnapshot ? "fawazahmed0" : "offline";
  const providers: Record<FxProvider, FxProviderStatus> = {
    frankfurter: buildProviderStatus(
      "frankfurter",
      primaryProvider === "frankfurter" ? primarySnapshot : null,
      primaryProvider === "frankfurter" ? primarySource : "none"
    ),
    ecb: buildProviderStatus(
      "ecb",
      primaryProvider === "ecb" ? primarySnapshot : null,
      primaryProvider === "ecb" ? primarySource : "none"
    ),
    fawazahmed0: buildProviderStatus("fawazahmed0", fallbackSnapshot, fallbackSource),
  };
  return {
    provider,
    cryptoProvider,
    updatedAt: primarySnapshot?.fetchedAt ?? fallbackSnapshot?.fetchedAt,
    source: provider === "offline" ? "none" : primarySnapshot ? primarySource : fallbackSource,
    stale: primarySnapshot ? isStale(primarySnapshot) : fallbackSnapshot ? isStale(fallbackSnapshot) : true,
    lastError,
    providers,
  };
};

export const initFxRates = async (): Promise<void> => {
  if (!cachedSnapshot) {
    cachedSnapshot = loadCachedSnapshot(FX_CACHE_KEY);
  }
  if (!cachedFawazSnapshot) {
    cachedFawazSnapshot = loadCachedSnapshot(FX_FAWAZ_CACHE_KEY);
  }
  if (cachedSnapshot || cachedFawazSnapshot) {
    setStatus(
      buildStatus(
        cachedSnapshot,
        cachedSnapshot ? "cache" : "none",
        cachedFawazSnapshot,
        cachedFawazSnapshot ? "cache" : "none"
      )
    );
  }
  const shouldRefresh =
    !cachedSnapshot ||
    isStale(cachedSnapshot) ||
    !cachedFawazSnapshot ||
    isStale(cachedFawazSnapshot);
  if (shouldRefresh) {
    await refreshFxRates();
  }
  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      refreshFxRates();
    });
  }
};

export const refreshFxRates = async (): Promise<void> => {
  const existing = cachedSnapshot;
  const existingFawaz = cachedFawazSnapshot;
  let primarySnapshot: FxRatesSnapshot | null = null;
  let primarySource: "live" | "cache" | "none" = "none";
  let fallbackSnapshot: FxRatesSnapshot | null = null;
  let fallbackSource: "live" | "cache" | "none" = "none";
  let lastError: string | undefined;

  const fawazPromise = fetchFawazahmed0().catch(() => null);
  try {
    const frankfurter = await fetchFrankfurter();
    if (frankfurter) {
      primarySnapshot = frankfurter;
      primarySource = "live";
    }
  } catch (error) {
    // fall through to ECB
  }

  try {
    if (!primarySnapshot) {
      const ecb = await fetchEcb();
      if (ecb) {
        primarySnapshot = ecb;
        primarySource = "live";
      }
    }
  } catch (error) {
    // ignore
  }

  fallbackSnapshot = await fawazPromise;
  if (fallbackSnapshot) {
    fallbackSource = "live";
  }

  if (!primarySnapshot && existing) {
    primarySnapshot = existing;
    primarySource = "cache";
  }
  if (!fallbackSnapshot && existingFawaz) {
    fallbackSnapshot = existingFawaz;
    fallbackSource = "cache";
  }

  if (primarySnapshot) {
    saveCachedSnapshot(primarySnapshot, FX_CACHE_KEY);
  }
  if (fallbackSnapshot) {
    saveCachedSnapshot(fallbackSnapshot, FX_FAWAZ_CACHE_KEY);
  }

  if (!primarySnapshot && !fallbackSnapshot) {
    lastError = "Unable to load FX rates.";
  } else if (!primarySnapshot && fallbackSnapshot) {
    lastError = "Primary FX providers unavailable. Using fallback rates.";
  } else if (primarySnapshot && primarySource !== "live") {
    lastError = "Unable to refresh FX rates. Using cached values.";
  }

  setStatus(buildStatus(primarySnapshot, primarySource, fallbackSnapshot, fallbackSource, lastError));
};

export const getCachedFxRate = (fromCode: string, toCode: string): number | null => {
  if (!cachedSnapshot) {
    cachedSnapshot = loadCachedSnapshot(FX_CACHE_KEY);
  }
  if (!cachedFawazSnapshot) {
    cachedFawazSnapshot = loadCachedSnapshot(FX_FAWAZ_CACHE_KEY);
  }
  const resolveRate = (snapshot: FxRatesSnapshot | null): number | null => {
    if (!snapshot) return null;
    const base = snapshot.base.toUpperCase();
    const rates = snapshot.rates;
    const from = fromCode.toUpperCase();
    const to = toCode.toUpperCase();
    if (from === to) return 1;
    const fromRate = from === base ? 1 : rates[from];
    const toRate = to === base ? 1 : rates[to];
    if (!fromRate || !toRate) return null;
    return toRate / fromRate;
  };

  const primaryRate = resolveRate(cachedSnapshot);
  if (primaryRate) return primaryRate;
  return resolveRate(cachedFawazSnapshot);
};

export const getSupportedFxCodes = (): string[] => {
  return CurrencyValue.getSupportedCodes();
};
