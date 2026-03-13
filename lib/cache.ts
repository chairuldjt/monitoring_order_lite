/**
 * Simple In-memory Cache for SIMRS Data
 */

interface CacheEntry {
    data: any;
    timestamp: number;
    ttl: number;
}

interface SummaryState {
    counts: Record<string, number>;
    timestamp: number;
}

class SIMRSCache {
    private static instance: SIMRSCache;
    private store: Map<string, CacheEntry> = new Map();
    private lastSummary: SummaryState | null = null;

    private constructor() { }

    public static getInstance(): SIMRSCache {
        if (!SIMRSCache.instance) {
            SIMRSCache.instance = new SIMRSCache();
        }
        return SIMRSCache.instance;
    }

    /**
     * Set cache entry
     * @param key Cache key (e.g. 'orders_status_10')
     * @param data Data to cache
     * @param ttl Time to live in milliseconds (default 30 mins)
     */
    public set(key: string, data: any, ttl: number = 30 * 60 * 1000): void {
        this.store.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    /**
     * Get cache entry if valid
     */
    public get(key: string): any | null {
        const entry = this.store.get(key);
        if (!entry) return null;

        const isExpired = Date.now() - entry.timestamp > entry.ttl;
        if (isExpired) {
            this.store.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Set last known summary state
     */
    public setSummaryState(counts: Record<string, number>): void {
        this.lastSummary = {
            counts,
            timestamp: Date.now()
        };
    }

    /**
     * Get last known summary state
     */
    public getSummaryState(): SummaryState | null {
        return this.lastSummary;
    }

    /**
     * Invalidate all or specific part of cache
     */
    public invalidate(key?: string): void {
        if (key) {
            this.store.delete(key);
        } else {
            this.store.clear();
        }
    }
}

export const cache = SIMRSCache.getInstance();
