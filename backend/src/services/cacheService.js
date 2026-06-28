const { getRedisConnection } = require('../queue/queueManager');

const CACHE_TTL = 300; // 5 menit

/**
 * Mendapatkan cache key untuk feed pengguna
 */
function getFeedCacheKey(userId, queryParams) {
  const queryStr = JSON.stringify(queryParams);
  return `feed:user:${userId || 'anonymous'}:${queryStr}`;
}

/**
 * Mendapatkan feed dari cache
 */
async function getCachedFeed(userId, queryParams) {
  const redis = getRedisConnection();
  if (!redis) return null;

  try {
    const key = getFeedCacheKey(userId, queryParams);
    const cachedData = await redis.get(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  } catch (err) {
    console.error('[CacheService] Error getting feed from cache:', err.message);
  }
  return null;
}

/**
 * Menyimpan feed ke cache
 */
async function cacheFeed(userId, queryParams, data) {
  const redis = getRedisConnection();
  if (!redis) return false;

  try {
    const key = getFeedCacheKey(userId, queryParams);
    await redis.set(key, JSON.stringify(data), 'EX', CACHE_TTL);
    return true;
  } catch (err) {
    console.error('[CacheService] Error saving feed to cache:', err.message);
  }
  return false;
}

/**
 * Menghapus cache (invalidasi) untuk seorang user
 */
async function invalidateUserCache(userId) {
  const redis = getRedisConnection();
  if (!redis) return false;

  try {
    // Menghapus semua cache feed untuk user ini
    // Di Redis, untuk scan/keys menggunakan pattern 'feed:user:userId:*'
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
 * Menghapus cache (invalidasi) untuk semua user (global)
 */
async function invalidateAllFeedCache() {
  const redis = getRedisConnection();
  if (!redis) return false;

  try {
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
  getCachedFeed,
  cacheFeed,
  invalidateUserCache,
  invalidateAllFeedCache,
};
