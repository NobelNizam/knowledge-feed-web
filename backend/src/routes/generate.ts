/**
 * Generate Routes — API Endpoint untuk AI Pipeline
 */

import express, { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth';
import { addPipelineJob, getQueueStats } from '../queue/queueManager';
import { createPipelineJob } from '../pipeline/publisher';
import { executePipeline } from '../queue/workers/pipelineWorker';

import prisma from '../lib/prisma';

const router: Router = express.Router();

// ponytail: trust-boundary clamp; same shape as feed.ts/knowledge.ts.
const clampLimit = (raw: any, max = 100, fallback = 20): number => {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
};

/**
 * POST /api/generate
 * Trigger AI content pipeline
 * Body: { topics?: string[], count?: number, async?: boolean }
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { topics, count = 5, async: isAsync = true } = req.body || {};

    const pipelineJob = await createPipelineJob({
      type: 'full_pipeline',
      input: { topics, count },
    });

    if (isAsync) {
      try {
        const bullmqJob = await addPipelineJob({
          topics,
          count,
          pipelineJobId: pipelineJob.id,
        });

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
      } catch (queueError: any) {
        console.warn('[Generate] BullMQ not available, falling back to sync execution:', queueError.message);
      }
    }

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
    res.status(500).json({ error: 'Failed to run pipeline', details: (error as Error).message });
  }
});

/**
 * GET /api/generate/status/:jobId
 */
router.get('/status/:jobId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const job = await prisma.pipelineJob.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Pipeline job not found' });

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
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    let queueStats: any = null;
    try {
      queueStats = await getQueueStats();
    } catch {
      queueStats = { error: 'Redis/BullMQ not available' };
    }

    const recentJobs = await prisma.pipelineJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      success: true,
      data: { queues: queueStats, recentJobs },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/generate/sources
 */
router.get('/sources', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { offset = 0 } = req.query;
    const limit = clampLimit(req.query.limit);

    const sources = await prisma.knowledgeSource.findMany({
      take: limit,
      skip: parseInt(String(offset)),
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { chunks: true } } },
    });

    const total = await prisma.knowledgeSource.count();

    res.json({
      success: true,
      data: sources,
      pagination: { limit, offset: parseInt(String(offset)), total },
    });
  } catch (error) {
    console.error('Sources error:', error);
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

export = router;
