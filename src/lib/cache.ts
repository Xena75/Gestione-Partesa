// Sistema di cache semplice in memoria per ottimizzare le performance

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minuti di default

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Controlla se l'entry è scaduta
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Genera una chiave di cache basata sui parametri
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `${prefix}:${sortedParams}`;
  }

  // Pulisce le entry scadute
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Statistiche cache
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Istanza globale della cache
export const cache = new SimpleCache();

// Pulisce la cache ogni 10 minuti
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);

// Funzioni helper per cache specifiche
export const cacheKeys = {
  STATS: 'stats',
  FILTERS: 'filters',
  DATA: 'data'
} as const;

// Funzione per cache con retry automatico
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Prova a recuperare dalla cache
  const cached = cache.get<T>(key);
  if (cached !== null) {
    console.log(`🎯 Cache HIT per: ${key}`);
    return cached;
  }

  console.log(`🔄 Cache MISS per: ${key}, eseguendo query...`);
  
  try {
    const data = await fetchFn();
    cache.set(key, data, ttl);
    console.log(`✅ Dati salvati in cache: ${key}`);
    return data;
  } catch (error) {
    console.error(`❌ Errore nel fetch per ${key}:`, error);
    throw error;
  }
}
