/**
 * Generate Routes — API Endpoint untuk AI Pipeline
 * 
 * POST /api/generate - Trigger pipeline generation
 * GET /api/generate/status/:jobId - Cek status pipeline job
 * GET /api/generate/stats - Queue stats
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { addPipelineJob, getQueueStats } = require('../queue/queueManager');
const { createPipelineJob } = require('../pipeline/publisher');
const { executePipeline } = require('../queue/workers/pipelineWorker');

const prisma = require('../lib/prisma');

// ponytail: trust-boundary clamp; same shape as feed.js/knowledge.js.
const clampLimit = (raw, max = 100, fallback = 20) => {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
};

/**
 * POST /api/generate
 * Trigger AI content pipeline
 * Body: { topics?: string[], count?: number, async?: boolean }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { topics, count = 5, async: isAsync = true } = req.body;

    // Create pipeline job record
    const pipelineJob = await createPipelineJob({
      type: 'full_pipeline',
      input: { topics, count },
    });

    if (isAsync) {
      // Enqueue to BullMQ for async processing
      try {
        const bullmqJob = await addPipelineJob({
          topics,
          count,
          pipelineJobId: pipelineJob.id,
        });

        // Update job with BullMQ ID
        await prisma.pipelineJob.update({
          where: { id: pipelineJob.id },
          data: { bullmqJobId: bullmqJob.id },
        });

        return res.status(202).json({
          success: true,
          message: 'Pipeline job queued',
          jobId: pipelineJob.id,
          bullmqJobId: bullmqJob.id,
          status: 'queued',
        });
      } catch (queueError) {
        // If Redis/BullMQ is not available, fall back to sync execution
        console.warn('[Generate] BullMQ not available, falling back to sync execution:', queueError.message);
      }
    }

    // Sync execution (blocking)
    await prisma.pipelineJob.update({
      where: { id: pipelineJob.id },
      data: { status: 'processing', startedAt: new Date() },
    });

    const result = await executePipeline({
      topics,
      count,
      pipelineJobId: pipelineJob.id,
    });

    res.json({
      success: true,
      jobId: pipelineJob.id,
      status: 'completed',
      publishedCards: result.publishedCards.length,
      data: result,
    });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ error: 'Failed to run pipeline', details: error.message });
  }
});

/**
 * GET /api/generate/status/:jobId
 * Cek status pipeline job
 */
router.get('/status/:jobId', authMiddleware, async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await prisma.pipelineJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return res.status(404).json({ error: 'Pipeline job not found' });
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        type: job.type,
        status: job.status,
        currentStep: job.currentStep,
        progress: job.progress,
        input: job.input,
        output: job.output,
        error: job.error,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt,
      },
    });
  } catch (error) {
    console.error('Job status error:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

/**
 * GET /api/generate/stats
 * Get queue statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    let queueStats = null;
    try {
      queueStats = await getQueueStats();
    } catch (e) {
      queueStats = { error: 'Redis/BullMQ not available' };
    }

    // Get recent pipeline jobs
    const recentJobs = await prisma.pipelineJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        queues: queueStats,
        recentJobs,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/generate/sources
 * Get knowledge sources (papers crawled)
 */
router.get('/sources', authMiddleware, async (req, res) => {
  try {
    const { offset = 0 } = req.query;
    const limit = clampLimit(req.query.limit);

    const sources = await prisma.knowledgeSource.findMany({
      take: limit,
      skip: parseInt(offset),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    const total = await prisma.knowledgeSource.count();

    res.json({
      success: true,
      data: sources,
      pagination: { limit, offset: parseInt(offset), total },
    });
  } catch (error) {
    console.error('Sources error:', error);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

module.exports = router;

