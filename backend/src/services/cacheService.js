const { getRedisConnection } = require('../queue/queueManager');

const CACHE_TTL = 900; // 15 menit (ponytail: dioptimalkan)

/**
 * Mendapatkan cache key untuk domain feed tertentu
 */
function getDomainCacheKey(domain) {
  return `feed:domain:${domain || '__all__'}`;
}

/**
 * Mendapatkan feed domain dari cache Redis
 */
async function getDomainCache(domain) {
  const redis = getRedisConnection();
  if (!redis) return null;

  try {
    const key = getDomainCacheKey(domain);
    const cachedData = await redis.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (err) {
    console.error(`[CacheService] Error getting cache for domain ${domain}:`, err.message);
  }
  return null;
}

/**
 * Menyimpan feed domain ke cache Redis
 */
async function setDomainCache(domain, cards) {
  const redis = getRedisConnection();
  if (!redis) return false;

  try {
    const key = getDomainCacheKey(domain);
    // Menyimpan max 150 item untuk menjaga ukuran cache efisien
    const dataToCache = cards.slice(0, 150);
    await redis.set(key, JSON.stringify(dataToCache), 'EX', CACHE_TTL);
    return true;
  } catch (err) {
    console.error(`[CacheService] Error setting cache for domain ${domain}:`, err.message);
  }
  return false;
}

/**
 * Menghapus cache domain tertentu
 */
async function invalidateDomainCache(domain) {
  const redis = getRedisConnection();
  if (!redis) return false;

  try {
    const key = getDomainCacheKey(domain);
    await redis.del(key);
    return true;
  } catch (err) {
    console.error(`[CacheService] Error invalidating cache for domain ${domain}:`, err.message);
  }
  return false;
}

/**
 * Menghapus semua cache domain (keys feed:domain:*)
 */
async function invalidateAllDomainCaches() {
  const redis = getRedisConnection();
  if (!redis) return false;

  try {
    const keys = await redis.keys('feed:domain:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (err) {
    console.error('[CacheService] Error invalidating all domain caches:', err.message);
  }
  return false;
}



/**
 * Menghapus cache (invalidasi) untuk seorang user (Legacy)
 */
async function invalidateUserCache(userId) {
  const redis = getRedisConnection();
  if (!redis) return false;

  try {
    const keys = await redis.keys(`feed:user:${userId || 'anonymous'}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (err) {
    console.error('[CacheService] Error invalidating user cache:', err.message);
  }
  return false;
}

/**
 * Menghapus cache (invalidasi) untuk semua user (global) + clear domain caches
 */
async function invalidateAllFeedCache() {
  const redis = getRedisConnection();
  if (!redis) return false;

  try {
    // Bersihkan cache domain baru
    await invalidateAllDomainCaches();

    // Bersihkan cache user (Legacy)
    const keys = await redis.keys('feed:user:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    return true;
  } catch (err) {
    console.error('[CacheService] Error invalidating global cache:', err.message);
  }
  return false;
}

module.exports = {
  getDomainCache,
  setDomainCache,
  invalidateDomainCache,
  invalidateAllDomainCaches,
  invalidateUserCache,
  invalidateAllFeedCache,
};
