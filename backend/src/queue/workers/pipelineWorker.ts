/**
 * Pipeline Worker — Main Orchestrator
 *
 * BullMQ worker yang mengorkestrasi seluruh RAG pipeline
 * step-by-step: Crawl → Clean → Chunk → Embed → Retrieve → Generate → Fact-Check → Moderate → Publish
 */

import { Worker } from 'bullmq';
import { getRedisConnection, QUEUE_NAMES } from '../queueManager';

// Pipeline components (kept as CommonJS imports; tsx resolves the .js sibling).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fetchMultipleTopics, getDefaultTopics }: any = require('../../pipeline/crawler');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { cleanAndDeduplicate }: any = require('../../pipeline/cleaner');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { chunkDocuments }: any = require('../../pipeline/chunker');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { embedBatch }: any = require('../../pipeline/embedder');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { initializeVectorStore, insertChunksWithEmbeddings }: any = require('../../pipeline/vectorStore');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { retrieve, buildCitations }: any = require('../../pipeline/retriever');
import { generateWithRAG } from '../../services/aiGenerator';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { factCheckCard, saveFactCheckResults }: any = require('../../pipeline/factChecker');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { moderateCard }: any = require('../../pipeline/moderator');
import { publishCard, updateJobStatus, invalidateFeedCache } from '../../pipeline/publisher';

import prisma from '../../lib/prisma';

const activeCallbacks = new Map<string, (step: string, progress: number, details: any) => void>();

/**
 * Update progress pada database PipelineJob
 */
async function updateProgress(
  pipelineJobId: string | null | undefined,
  step: string,
  progress: number,
  details: any = null
) {
  if (!pipelineJobId) return;

  await updateJobStatus(pipelineJobId, {
    currentStep: step,
    progress,
    status: 'processing',
    ...(details ? { output: details } : {}),
  });

  const cb = activeCallbacks.get(pipelineJobId);
  if (cb) {
    try {
      cb(step, progress, details);
    } catch (err: any) {
      console.error(`[PipelineWorker] Error in onProgress callback for job ${pipelineJobId}:`, err.message);
    }
  }
}

interface PipelineJobData {
  topics?: string[];
  count?: number;
  pipelineJobId?: string;
  subtopicMap?: Record<string, string[]> | null;
}

interface PipelineResult {
  steps: Record<string, any>;
  publishedCards: any[];
  errors: any[];
}

export type ProgressCallback = (step: string, progress: number, details?: any) => void;

/**
 * Main pipeline execution function
 */
export async function executePipeline(
  jobData: PipelineJobData,
  onProgress: ProgressCallback | null = null
): Promise<PipelineResult> {
  const { topics, count = 5, pipelineJobId, subtopicMap = null } = jobData;
  if (pipelineJobId && onProgress) {
    activeCallbacks.set(pipelineJobId, onProgress);
  }
  const pipelineTopics: string[] = topics && topics.length > 0 ? topics : getDefaultTopics();

  console.log(`[Pipeline] Starting pipeline for topics: ${pipelineTopics.join(', ')} (count: ${count})`);

  const startTime = Date.now();
  const result: PipelineResult = {
    steps: {},
    publishedCards: [],
    errors: [],
  };

  try {
    // === STEP 1: Initialize Vector Store ===
    await updateProgress(pipelineJobId, 'initialize', 5);
    console.log('[Pipeline] Step 1: Initializing vector store...');
    await initializeVectorStore();
    result.steps.initialize = { status: 'done' };

    // === STEP 2: Crawl ===
    await updateProgress(pipelineJobId, 'crawl', 10);
    console.log('[Pipeline] Step 2: Crawling sources...');
    const rawPapers: any[] = await fetchMultipleTopics(pipelineTopics, Math.max(2, Math.ceil(count / 3)));
    result.steps.crawl = { status: 'done', papersFound: rawPapers.length };

    if (rawPapers.length === 0) {
      console.log('[Pipeline] No papers found, falling back to direct generation');
      await updateProgress(pipelineJobId, 'generate_fallback', 50);
      let fallbackCards: any[] = [];
      try {
        fallbackCards = await generateWithRAG({ count, domains: pipelineTopics, subtopicMap });
      } catch (err: any) {
        console.error('[Pipeline] Fallback generateWithRAG failed:', err.message);
        result.errors.push({ step: 'generate_fallback', error: err.message });
      }
      for (const cardData of fallbackCards) {
        const modResult = moderateCard(cardData);
        if (modResult.status !== 'blocked') {
          const card = await publishCard(
            cardData,
            { verified: false, confidence: 0 },
            modResult,
            []
          );
          if (card) result.publishedCards.push(card);
        }
      }
      await updateProgress(pipelineJobId, 'completed', 100, result);
      return result;
    }

    // === STEP 3: Clean & Deduplicate ===
    await updateProgress(pipelineJobId, 'clean', 20);
    console.log('[Pipeline] Step 3: Cleaning & deduplicating...');
    const cleanedPapers: any[] = await cleanAndDeduplicate(rawPapers);
    result.steps.clean = { status: 'done', uniquePapers: cleanedPapers.length };

    if (cleanedPapers.length === 0) {
      console.log('[Pipeline] All papers are duplicates, falling back to direct generation');
      await updateProgress(pipelineJobId, 'generate_fallback', 50);
      let fallbackCards: any[] = [];
      try {
        fallbackCards = await generateWithRAG({ count, domains: pipelineTopics, subtopicMap });
      } catch (err: any) {
        console.error('[Pipeline] Fallback generateWithRAG failed:', err.message);
        result.errors.push({ step: 'generate_fallback', error: err.message });
      }
      for (const cardData of fallbackCards) {
        const modResult = moderateCard(cardData);
        if (modResult.status !== 'blocked') {
          const card = await publishCard(
            cardData,
            { verified: false, confidence: 0 },
            modResult,
            []
          );
          if (card) result.publishedCards.push(card);
        }
      }
      await updateProgress(pipelineJobId, 'completed', 100, result);
      return result;
    }

    // === STEP 4: Save sources to DB ===
    await updateProgress(pipelineJobId, 'save_sources', 25);
    console.log('[Pipeline] Step 4: Saving sources to database...');
    const savedSources: any[] = [];
    for (const paper of cleanedPapers) {
      try {
        const source = await prisma.knowledgeSource.create({
          data: {
            externalId: paper.arxivId || `paper-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sourceType: 'arxiv',
            title: paper.title,
            authors: paper.authors || [],
            abstract: paper.abstract || null,
            url: paper.url || null,
            pdfUrl: paper.pdfUrl || null,
            category: paper.category || null,
            publishedDate: paper.publishedDate || null,
            contentHash: paper.contentHash || null,
            rawContent: paper.abstract || null,
            cleanedContent: paper.cleanedContent || null,
            status: 'cleaned',
          },
        });
        savedSources.push(source);
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`[Pipeline] Source already exists: ${paper.arxivId}`);
        } else {
          console.error(`[Pipeline] Failed to save source:`, error.message);
        }
      }
    }
    result.steps.saveSources = { status: 'done', saved: savedSources.length };

    // === STEP 5: Chunk ===
    await updateProgress(pipelineJobId, 'chunk', 35);
    console.log('[Pipeline] Step 5: Chunking documents...');
    const documentsToChunk = savedSources.map((s) => ({
      id: s.id,
      cleanedContent: s.cleanedContent || s.abstract || '',
    }));
    const chunks: any[] = chunkDocuments(documentsToChunk);
    result.steps.chunk = { status: 'done', totalChunks: chunks.length };

    // === STEP 6: Embed ===
    await updateProgress(pipelineJobId, 'embed', 45);
    console.log('[Pipeline] Step 6: Generating embeddings...');
    const chunkTexts = chunks.map((c) => c.content);
    const embeddings: any[] = await embedBatch(chunkTexts);
    result.steps.embed = { status: 'done', embeddingsGenerated: embeddings.filter(Boolean).length };

    // === STEP 7: Store in Vector DB ===
    await updateProgress(pipelineJobId, 'store_vectors', 55);
    console.log('[Pipeline] Step 7: Storing vectors...');
    const storedChunks: any[] = await insertChunksWithEmbeddings(chunks, embeddings);

    for (const source of savedSources) {
      await prisma.knowledgeSource.update({
        where: { id: source.id },
        data: { status: 'embedded' },
      });
    }
    result.steps.storeVectors = { status: 'done', stored: storedChunks.length };

    // === STEP 8: Retrieve & Generate ===
    await updateProgress(pipelineJobId, 'retrieve_generate', 65);
    console.log('[Pipeline] Step 8: Retrieving context & generating cards...');

    const retrievalQuery = pipelineTopics.join(' ');
    const retrieval: any = await retrieve(retrievalQuery, { topK: 10 });

    let generatedCards: any[] = [];
    try {
      generatedCards = await generateWithRAG({
        count,
        domains: pipelineTopics,
        subtopicMap,
        context: retrieval.context,
        citations: buildCitations(retrieval.sourceChunks),
      });
    } catch (err: any) {
      console.error('[Pipeline] generateWithRAG failed:', err.message);
      result.errors.push({ step: 'retrieve_generate', error: err.message });
    }
    result.steps.generate = { status: 'done', cardsGenerated: generatedCards.length };

    // === STEP 9: Fact-Check ===
    await updateProgress(pipelineJobId, 'fact_check', 75);
    console.log('[Pipeline] Step 9: Fact-checking cards (parallel)...');
    const factCheckResults: any[] = await Promise.all(
      generatedCards.map(async (cardData) => {
        try {
          return await factCheckCard(cardData);
        } catch (error: any) {
          console.error(`[Pipeline] Fact-check failed for "${cardData.title}":`, error.message);
          return { verified: false, confidence: 0, sources: [], details: { error: error.message } };
        }
      })
    );
    result.steps.factCheck = { status: 'done', checked: factCheckResults.length };

    // === STEP 10: Moderate ===
    await updateProgress(pipelineJobId, 'moderate', 85);
    console.log('[Pipeline] Step 10: Moderating cards...');
    const moderationResults: any[] = generatedCards.map((card) => moderateCard(card));
    result.steps.moderate = {
      status: 'done',
      approved: moderationResults.filter((r) => r.status === 'approved').length,
      review: moderationResults.filter((r) => r.status === 'review').length,
      blocked: moderationResults.filter((r) => r.status === 'blocked').length,
    };

    // === STEP 11: Publish ===
    await updateProgress(pipelineJobId, 'publish', 90);
    console.log('[Pipeline] Step 11: Publishing approved cards...');
    for (let i = 0; i < generatedCards.length; i++) {
      const cardData = generatedCards[i];
      const fcResult = factCheckResults[i];
      const modResult = moderationResults[i];

      if (modResult.status === 'blocked') {
        console.log(`[Pipeline] Skipping blocked card: "${cardData.title}"`);
        continue;
      }

      try {
        const card = await publishCard(cardData, fcResult, modResult, retrieval.sourceChunks);
        if (!card) continue;
        if (fcResult.sources && fcResult.sources.length > 0) {
          await saveFactCheckResults(card.id, fcResult);
        }
        result.publishedCards.push(card);
      } catch (error: any) {
        console.error(`[Pipeline] Failed to publish "${cardData.title}":`, error.message);
        result.errors.push({ card: cardData.title, error: error.message });
      }
    }

    // === STEP 12: Invalidate Cache ===
    await updateProgress(pipelineJobId, 'invalidate_cache', 95);
    console.log('[Pipeline] Step 12: Invalidating cache...');
    await invalidateFeedCache(pipelineTopics);

    if (result.publishedCards.length === 0) {
      console.warn('[Pipeline] ⚠️ All cards were duplicates — nothing published');
    }
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Pipeline] ✅ Complete! Published ${result.publishedCards.length}/${generatedCards.length} cards in ${duration}s`);

    result.steps.complete = { status: 'done', duration: `${duration}s` };
    await updateProgress(pipelineJobId, 'completed', 100, result);

    return result;
  } catch (error: any) {
    console.error('[Pipeline] ❌ Pipeline failed:', error.message);
    result.errors.push({ step: 'pipeline', error: error.message });

    if (pipelineJobId) {
      await updateJobStatus(pipelineJobId, {
        status: 'failed',
        error: error.message,
        output: result,
      });
    }

    throw error;
  } finally {
    if (pipelineJobId) {
      activeCallbacks.delete(pipelineJobId);
    }
  }
}

/**
 * Create dan start BullMQ worker
 */
export function createPipelineWorker() {
  const worker = new Worker(
    QUEUE_NAMES.CONTENT_PIPELINE,
    async (job) => {
      console.log(`[PipelineWorker] Processing job ${job.id}: ${JSON.stringify(job.data)}`);
      return await executePipeline(job.data);
    },
    {
      connection: getRedisConnection() as any,
      concurrency: 1,
      limiter: {
        max: 5,
        duration: 60000,
      },
    }
  );

  worker.on('completed', (job, result: any) => {
    console.log(`[PipelineWorker] Job ${job.id} completed. Published ${result.publishedCards?.length || 0} cards.`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[PipelineWorker] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('[PipelineWorker] Worker error:', error.message);
  });

  console.log('[PipelineWorker] Worker started, listening for pipeline jobs...');
  return worker;
}
