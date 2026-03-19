type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const resultCache = new Map<string, CacheEntry<unknown>>();
const inFlightCache = new Map<string, Promise<unknown>>();

export function getCachedValue<T>(key: string): T | null {
  const entry = resultCache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    resultCache.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number) {
  resultCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function getInFlightValue<T>(key: string): Promise<T> | null {
  return (inFlightCache.get(key) as Promise<T> | undefined) ?? null;
}

export function setInFlightValue<T>(key: string, promise: Promise<T>) {
  inFlightCache.set(key, promise);
}

export function clearInFlightValue(key: string) {
  inFlightCache.delete(key);
}
