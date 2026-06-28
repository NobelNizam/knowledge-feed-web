/**
 * Queue Manager — BullMQ Setup & Queue Definitions
 * 
 * Mengelola koneksi Redis dan definisi queue untuk
 * AI Knowledge Pipeline.
 */

const { Queue, Worker, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');

// Redis connection (shared across all queues)
let redisConnection = null;

/**
 * Get atau create Redis connection
 * @returns {IORedis} Redis connection instance
 */
function getRedisConnection() {
  if (!redisConnection) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });

    redisConnection.on('connect', () => {
      console.log('[QueueManager] Redis connected');
    });

    redisConnection.on('error', (err) => {
      console.error('[QueueManager] Redis error:', err.message);
    });
  }

  return redisConnection;
}

// Queue definitions
const QUEUE_NAMES = {
  CONTENT_PIPELINE: 'content-pipeline',
  CRAWL: 'crawl',
  EMBED: 'embed',
  GENERATE: 'generate',
  FACT_CHECK: 'fact-check',
  MODERATE: 'moderate',
};

// Queue instances cache
const queues = {};

/**
 * Get atau create sebuah queue
 * @param {string} queueName - Nama queue
 * @returns {Queue} BullMQ Queue instance
 */
function getQueue(queueName) {
  if (!queues[queueName]) {
    queues[queueName] = new Queue(queueName, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
        removeOnFail: { count: 50 }, // Keep last 50 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });
    console.log(`[QueueManager] Queue "${queueName}" initialized`);
  }
  return queues[queueName];
}

/**
 * Add job ke content pipeline queue
 * @param {Object} jobData - Job data
 * @param {string[]} [jobData.topics] - Topics to generate content for
 * @param {number} [jobData.count=5] - Number of cards to generate
 * @param {string} [jobData.pipelineJobId] - Database PipelineJob ID
 * @returns {Promise<Object>} BullMQ Job
 */
async function addPipelineJob(jobData) {
  const queue = getQueue(QUEUE_NAMES.CONTENT_PIPELINE);
  const job = await queue.add('run-pipeline', {
    topics: jobData.topics || [],
    count: jobData.count || 5,
    pipelineJobId: jobData.pipelineJobId || null,
    createdAt: new Date().toISOString(),
  }, {
    priority: jobData.priority || 0,
  });

  console.log(`[QueueManager] Pipeline job added: ${job.id}`);
  return job;
}

/**
 * Get status dari semua queues
 * @returns {Promise<Object>} Queue stats
 */
async function getQueueStats() {
  const stats = {};

  for (const [key, name] of Object.entries(QUEUE_NAMES)) {
    const queue = getQueue(name);
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    stats[key] = { name, waiting, active, completed, failed };
  }

  return stats;
}

/**
 * Graceful shutdown — close semua queue connections
 */
async function closeAllQueues() {
  for (const [name, queue] of Object.entries(queues)) {
    await queue.close();
    console.log(`[QueueManager] Queue "${name}" closed`);
  }

  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    console.log('[QueueManager] Redis disconnected');
  }
}

module.exports = {
  getRedisConnection,
  getQueue,
  addPipelineJob,
  getQueueStats,
  closeAllQueues,
  QUEUE_NAMES,
};
