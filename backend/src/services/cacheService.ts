import type { Redis } from 'ioredis';
import { getRedisConnection } from '../queue/queueManager';

const CACHE_TTL = 900; // 15 menit (ponytail: dioptimalkan)

/**
 * Mendapatkan cache key untuk domain feed tertentu
 */
function getDomainCacheKey(domain?: string | null): string {
  return `feed:domain:${domain || '__all__'}`;
}

/**
 * Mendapatkan feed domain dari cache Redis
 */
async function getDomainCache(domain?: string | null): Promise<any[] | null> {
  const redis: Redis | null = getRedisConnection();
  if (!redis) return null;

  try {
    const key = getDomainCacheKey(domain);
    const cachedData = await redis.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (err: any) {
    console.error(`[CacheService] Error getting cache for domain ${domain}:`, err.message);
  }
  return null;
}

/**
 * Menyimpan feed domain ke cache Redis
 */
async function setDomainCache(domain: string, cards: any[]): Promise<boolean> {
  const redis: Redis | null = getRedisConnection();
  if (!redis) return false;

  try {
    const key = getDomainCacheKey(domain);
    // Menyimpan max 150 item untuk menjaga ukuran cache efisien
    const dataToCache = cards.slice(0, 150);
    await redis.set(key, JSON.stringify(dataToCache), 'EX', CACHE_TTL);
    return true;
  } catch (err: any) {
    console.error(`[CacheService] Error setting cache for domain ${domain}:`, err.message);
  }
  return false;
}

/**
 * Menghapus cache domain tertentu
 */
async function invalidateDomainCache(domain: string): Promise<boolean> {
  const redis: Redis | null = getRedisConnection();
  if (!redis) return false;

  try {
    const key = getDomainCacheKey(domain);
    await redis.del(key);
    return true;
  } catch (err: any) {
    console.error(`[CacheService] Error invalidating cache for domain ${domain}:`, err.message);
  }
  return false;
}

// ponytail: SCAN-based key collection, batches DEL by 200 to keep memory
// bounded on a large keyspace. Replaces O(N) blocking KEYS. Upgrade path:
// use UNLINK (non-blocking del) once on Redis >= 4.0.
async function deleteByPattern(pattern: string): Promise<number> {
  const redis: Redis | null = getRedisConnection();
  if (!redis) return 0;

  const stream = redis.scanStream({ match: pattern, count: 200 });
  const collected: string[] = [];
  for await (const batch of stream) {
    for (const k of batch as string[]) collected.push(k);
  }
  if (collected.length === 0) return 0;

  const CHUNK = 200;
  for (let i = 0; i < collected.length; i += CHUNK) {
    await redis.del(...collected.slice(i, i + CHUNK));
  }
  return collected.length;
}

/**
 * Menghapus semua cache domain (keys feed:domain:*)
 */
async function invalidateAllDomainCaches(): Promise<boolean> {
  try {
    await deleteByPattern('feed:domain:*');
    return true;
  } catch (err: any) {
    console.error('[CacheService] Error invalidating all domain caches:', err.message);
    return false;
  }
}

/**
 * Menghapus cache (invalidasi) untuk seorang user (Legacy)
 */
async function invalidateUserCache(userId?: string | null): Promise<boolean> {
  try {
    await deleteByPattern(`feed:user:${userId || 'anonymous'}:*`);
    return true;
  } catch (err: any) {
    console.error('[CacheService] Error invalidating user cache:', err.message);
    return false;
  }
}

/**
 * Menghapus cache (invalidasi) untuk semua user (global) + clear domain caches
 */
async function invalidateAllFeedCache(): Promise<boolean> {
  try {
    // Bersihkan cache domain baru
    await invalidateAllDomainCaches();
    // Bersihkan cache user (Legacy)
    await deleteByPattern('feed:user:*');
    return true;
  } catch (err: any) {
    console.error('[CacheService] Error invalidating global cache:', err.message);
    return false;
  }
}

export {
  getDomainCacheKey,
  getDomainCache,
  setDomainCache,
  invalidateDomainCache,
  invalidateAllDomainCaches,
  invalidateUserCache,
  invalidateAllFeedCache,
};
