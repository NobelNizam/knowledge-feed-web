/**
 * Queue Manager — BullMQ Setup & Queue Definitions
 *
 * Mengelola koneksi Redis dan definisi queue untuk
 * AI Knowledge Pipeline.
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis, { Redis } from 'ioredis';

// Redis connection (shared across all queues)
let redisConnection: Redis | null = null;

/**
 * Get atau create Redis connection
 */
export function getRedisConnection(): Redis | null {
  if (!redisConnection) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });

    redisConnection.on('connect', () => {
      console.log('[QueueManager] Redis connected');
    });

    redisConnection.on('error', (err: Error) => {
      console.error('[QueueManager] Redis error:', err.message);
    });
  }

  return redisConnection;
}

export const QUEUE_NAMES = {
  CONTENT_PIPELINE: 'content-pipeline',
} as const;

// Queue instances cache
const queues: Record<string, Queue> = {};

/**
 * Get atau create sebuah queue
 */
export function getQueue(queueName: string): Queue {
  if (!queues[queueName]) {
    queues[queueName] = new Queue(queueName, {
      // ponytail: bullmq bundles its own ioredis; the host project version
      // has a different `options.Connector` shape. Cast is the documented
      // escape hatch and the wire protocol is identical.
      connection: getRedisConnection() as any,
      defaultJobOptions: {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
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

interface PipelineJobData {
  topics?: string[];
  count?: number;
  pipelineJobId?: string | null;
  priority?: number;
}

/**
 * Add job ke content pipeline queue
 */
export async function addPipelineJob(jobData: PipelineJobData) {
  const queue = getQueue(QUEUE_NAMES.CONTENT_PIPELINE);
  const job = await queue.add(
    'run-pipeline',
    {
      topics: jobData.topics || [],
      count: jobData.count || 5,
      pipelineJobId: jobData.pipelineJobId || null,
      createdAt: new Date().toISOString(),
    },
    {
      priority: jobData.priority || 0,
    }
  );

  console.log(`[QueueManager] Pipeline job added: ${job.id}`);
  return job;
}

interface QueueStatsEntry {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

/**
 * Get status dari semua queues
 */
export async function getQueueStats(): Promise<Record<string, QueueStatsEntry>> {
  const stats: Record<string, QueueStatsEntry> = {} as Record<string, QueueStatsEntry>;

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
export async function closeAllQueues(): Promise<void> {
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
