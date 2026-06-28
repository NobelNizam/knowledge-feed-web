/**
 * Pipeline Worker — Main Orchestrator
 * 
 * BullMQ worker yang mengorkestrasi seluruh RAG pipeline
 * step-by-step: Crawl → Clean → Chunk → Embed → Retrieve → Generate → Fact-Check → Moderate → Publish
 */

const { Worker } = require('bullmq');
const { getRedisConnection, QUEUE_NAMES } = require('../queueManager');

// Pipeline components
const { fetchMultipleTopics, getDefaultTopics } = require('../../pipeline/crawler');
const { cleanAndDeduplicate } = require('../../pipeline/cleaner');
const { chunkDocuments } = require('../../pipeline/chunker');
const { embedBatch } = require('../../pipeline/embedder');
const { initializeVectorStore, insertChunksWithEmbeddings } = require('../../pipeline/vectorStore');
const { retrieve, buildCitations } = require('../../pipeline/retriever');
const { generateWithRAG } = require('../../services/aiGenerator');
const { factCheckCard, saveFactCheckResults } = require('../../pipeline/factChecker');
const { moderateCard } = require('../../pipeline/moderator');
const { publishCard, updateJobStatus, invalidateFeedCache } = require('../../pipeline/publisher');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Update progress pada database PipelineJob
 */
async function updateProgress(pipelineJobId, step, progress, details = null) {
  if (!pipelineJobId) return;

  await updateJobStatus(pipelineJobId, {
    currentStep: step,
    progress,
    status: 'processing',
    ...(details ? { output: details } : {}),
  });
}

/**
 * Main pipeline execution function
 * @param {Object} jobData - Job data dari queue
 * @returns {Promise<Object>} Pipeline result
 */
async function executePipeline(jobData) {
  const { topics, count = 5, pipelineJobId, subtopicMap = null } = jobData;
  const pipelineTopics = topics && topics.length > 0 ? topics : getDefaultTopics();

  console.log(`[Pipeline] Starting pipeline for topics: ${pipelineTopics.join(', ')} (count: ${count})`);

  const startTime = Date.now();
  let result = {
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
    // Optimasi: Cukup 2 paper maksimal per topik untuk mempercepat
    const rawPapers = await fetchMultipleTopics(pipelineTopics, Math.max(2, Math.ceil(count / 3)));
    result.steps.crawl = { status: 'done', papersFound: rawPapers.length };

    if (rawPapers.length === 0) {
      console.log('[Pipeline] No papers found, falling back to direct generation');
      // Fallback: generate tanpa RAG context
      await updateProgress(pipelineJobId, 'generate_fallback', 50);
      const cards = await generateWithRAG({ count, domains: pipelineTopics, subtopicMap });
      
      for (const cardData of cards) {
        const modResult = moderateCard(cardData);
        if (modResult.status !== 'blocked') {
          const card = await publishCard(
            cardData,
            { verified: false, confidence: 0 },
            modResult,
            []
          );
          result.publishedCards.push(card);
        }
      }

      await updateProgress(pipelineJobId, 'completed', 100, result);
      return result;
    }

    // === STEP 3: Clean & Deduplicate ===
    await updateProgress(pipelineJobId, 'clean', 20);
    console.log('[Pipeline] Step 3: Cleaning & deduplicating...');
    const cleanedPapers = await cleanAndDeduplicate(rawPapers);
    result.steps.clean = { status: 'done', uniquePapers: cleanedPapers.length };

    if (cleanedPapers.length === 0) {
      console.log('[Pipeline] All papers are duplicates, falling back to direct generation');
      await updateProgress(pipelineJobId, 'generate_fallback', 50);
      const cards = await generateWithRAG({ count, domains: pipelineTopics, subtopicMap });
      
      for (const cardData of cards) {
        const modResult = moderateCard(cardData);
        if (modResult.status !== 'blocked') {
          const card = await publishCard(
            cardData,
            { verified: false, confidence: 0 },
            modResult,
            []
          );
          result.publishedCards.push(card);
        }
      }

      await updateProgress(pipelineJobId, 'completed', 100, result);
      return result;
    }

    // === STEP 4: Save sources to DB ===
    await updateProgress(pipelineJobId, 'save_sources', 25);
    console.log('[Pipeline] Step 4: Saving sources to database...');
    const savedSources = [];
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
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`[Pipeline] Source already exists: ${paper.arxivId}`);
        } else {
          console.error(`[Pipeline] Failed to save source: ${error.message}`);
        }
      }
    }
    result.steps.saveSources = { status: 'done', saved: savedSources.length };

    // === STEP 5: Chunk ===
    await updateProgress(pipelineJobId, 'chunk', 35);
    console.log('[Pipeline] Step 5: Chunking documents...');
    const documentsToChunk = savedSources.map(s => ({
      id: s.id,
      cleanedContent: s.cleanedContent || s.abstract || '',
    }));
    const chunks = chunkDocuments(documentsToChunk);
    result.steps.chunk = { status: 'done', totalChunks: chunks.length };

    // === STEP 6: Embed ===
    await updateProgress(pipelineJobId, 'embed', 45);
    console.log('[Pipeline] Step 6: Generating embeddings...');
    const chunkTexts = chunks.map(c => c.content);
    const embeddings = await embedBatch(chunkTexts);
    result.steps.embed = { status: 'done', embeddingsGenerated: embeddings.filter(Boolean).length };

    // === STEP 7: Store in Vector DB ===
    await updateProgress(pipelineJobId, 'store_vectors', 55);
    console.log('[Pipeline] Step 7: Storing vectors...');
    const storedChunks = await insertChunksWithEmbeddings(chunks, embeddings);

    // Update source status
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

    // Retrieve context dari vector store
    const retrievalQuery = pipelineTopics.join(' ');
    const retrieval = await retrieve(retrievalQuery, { topK: 10 });

    // Generate cards with RAG context
    const generatedCards = await generateWithRAG({
      count,
      domains: pipelineTopics,
      subtopicMap,
      context: retrieval.context,
      citations: buildCitations(retrieval.sourceChunks),
    });
    result.steps.generate = { status: 'done', cardsGenerated: generatedCards.length };

    // === STEP 9: Fact-Check ===
    await updateProgress(pipelineJobId, 'fact_check', 75);
    console.log('[Pipeline] Step 9: Fact-checking cards (parallel)...');
    
    // Paralelisasi fact checking agar lebih cepat!
    const factCheckResults = await Promise.all(
      generatedCards.map(async (cardData) => {
        try {
          return await factCheckCard(cardData);
        } catch (error) {
          console.error(`[Pipeline] Fact-check failed for "${cardData.title}":`, error.message);
          return { verified: false, confidence: 0, sources: [], details: { error: error.message } };
        }
      })
    );
    
    result.steps.factCheck = { status: 'done', checked: factCheckResults.length };

    // === STEP 10: Moderate ===
    await updateProgress(pipelineJobId, 'moderate', 85);
    console.log('[Pipeline] Step 10: Moderating cards...');
    const moderationResults = generatedCards.map(card => moderateCard(card));
    result.steps.moderate = {
      status: 'done',
      approved: moderationResults.filter(r => r.status === 'approved').length,
      review: moderationResults.filter(r => r.status === 'review').length,
      blocked: moderationResults.filter(r => r.status === 'blocked').length,
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

        // Save fact-check results to DB
        if (fcResult.sources && fcResult.sources.length > 0) {
          await saveFactCheckResults(card.id, fcResult);
        }

        result.publishedCards.push(card);
      } catch (error) {
        console.error(`[Pipeline] Failed to publish "${cardData.title}":`, error.message);
        result.errors.push({ card: cardData.title, error: error.message });
      }
    }

    // === STEP 12: Invalidate Cache ===
    await updateProgress(pipelineJobId, 'invalidate_cache', 95);
    console.log('[Pipeline] Step 12: Invalidating cache...');
    await invalidateFeedCache(pipelineTopics);

    // === DONE ===
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Pipeline] ✅ Complete! Published ${result.publishedCards.length}/${generatedCards.length} cards in ${duration}s`);

    result.steps.complete = { status: 'done', duration: `${duration}s` };
    await updateProgress(pipelineJobId, 'completed', 100, result);

    return result;

  } catch (error) {
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
  }
}

/**
 * Create dan start BullMQ worker
 * @returns {Worker} BullMQ Worker instance
 */
function createPipelineWorker() {
  const worker = new Worker(
    QUEUE_NAMES.CONTENT_PIPELINE,
    async (job) => {
      console.log(`[PipelineWorker] Processing job ${job.id}: ${JSON.stringify(job.data)}`);
      return await executePipeline(job.data);
    },
    {
      connection: getRedisConnection(),
      concurrency: 1, // Process one pipeline at a time
      limiter: {
        max: 5,
        duration: 60000, // Max 5 jobs per minute
      },
    }
  );

  worker.on('completed', (job, result) => {
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

module.exports = {
  executePipeline,
  createPipelineWorker,
};
