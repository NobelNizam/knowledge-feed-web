/**
 * Publisher — Database Publish & Cache Invalidation
 *
 * Menyimpan KnowledgeCard yang sudah lolos fact-check & moderation
 * ke database, dan menghapus cache feed.
 */


const prisma = require('../lib/prisma');
const { isAllowedDomain } = require('./moderator');

/**
 * Publish sebuah knowledge card ke database
 * @param {Object} cardData - Card data dari LLM generator
 * @param {Object} factCheckResult - Fact check result
 * @param {Object} moderationResult - Moderation result
 * @param {Array<Object>} sourceChunks - Source chunks yang digunakan
 * @returns {Promise<Object>} Created KnowledgeCard
 */
async function publishCard(cardData, factCheckResult, moderationResult, sourceChunks = []) {
  // Build citations from source chunks
  const citations = sourceChunks
    .filter(c => c.sourceTitle)
    .reduce((acc, chunk) => {
      // Deduplicate by sourceId
      if (!acc.find(c => c.sourceId === chunk.sourceId)) {
        acc.push({
          sourceId: chunk.sourceId,
          title: chunk.sourceTitle,
          url: chunk.sourceUrl || '',
          externalId: chunk.sourceExternalId || '',
          sourceType: chunk.sourceType || 'unknown',
          authors: chunk.authors || [],
        });
      }
      return acc;
    }, []);

  // ponytail: validate the LLM-produced domain against the allowlist before
  // it ever reaches the DB. The LLM is told to pick from a fixed list, but
  // it sometimes drifts; an unvalidated domain would pollute the domain
  // cache keyspace (`feed:domain:*`) and break the filter panel.
  const rawDomain = (cardData.domain || 'general').trim();
  const safeDomain = isAllowedDomain(rawDomain) ? rawDomain : 'general';

  // Create the card
  const card = await prisma.knowledgeCard.create({
    data: {
      title: cardData.title,
      content: cardData.content,
      domain: safeDomain,
      tags: cardData.tags || [],
      type: cardData.type || 'QUICK_FACT',
      aiModel: cardData.aiModel || process.env.NVIDIA_MODEL || 'unknown',
      sourceName: cardData.sourceName || 'AI Generated (RAG)',
      sourceUrl: cardData.sourceUrl || null,
      factChecked: factCheckResult.verified || false,
      factCheckScore: factCheckResult.confidence || 0,
      moderationStatus: moderationResult.status || 'pending',
      sourceChunkIds: sourceChunks.map(c => c.chunkId).filter(Boolean),
      citations: citations.length > 0 ? citations : null,
    },
  });

  console.log(`[Publisher] Published card: "${card.title}" (id: ${card.id}, fact-checked: ${card.factChecked}, moderation: ${card.moderationStatus})`);

  return card;
}

/**
 * Publish multiple cards
 * @param {Array<Object>} cardsWithResults - Array of { cardData, factCheckResult, moderationResult, sourceChunks }
 * @returns {Promise<Array<Object>>} Created KnowledgeCards
 */
async function publishCards(cardsWithResults) {
  const publishedCards = [];
  let skippedCount = 0;

  for (const { cardData, factCheckResult, moderationResult, sourceChunks } of cardsWithResults) {
    // Skip blocked cards
    if (moderationResult.status === 'blocked') {
      console.log(`[Publisher] Skipping blocked card: "${cardData.title}"`);
      skippedCount++;
      continue;
    }

    try {
      const card = await publishCard(cardData, factCheckResult, moderationResult, sourceChunks);
      publishedCards.push(card);
    } catch (error) {
      console.error(`[Publisher] Failed to publish card "${cardData.title}":`, error.message);
    }
  }

  console.log(`[Publisher] Published ${publishedCards.length} cards, skipped ${skippedCount}`);
  return publishedCards;
}

/**
 * Update pipeline job status
 * @param {string} jobId - PipelineJob ID
 * @param {Object} update - Update data
 */
async function updateJobStatus(jobId, update) {
  try {
    await prisma.pipelineJob.update({
      where: { id: jobId },
      data: {
        ...update,
        ...(update.status === 'completed' ? { completedAt: new Date() } : {}),
      },
    });
  } catch (error) {
    console.error(`[Publisher] Failed to update job ${jobId}:`, error.message);
  }
}

/**
 * Create pipeline job record
 * @param {Object} jobData - Job creation data
 * @returns {Promise<Object>} Created PipelineJob
 */
async function createPipelineJob(jobData) {
  const job = await prisma.pipelineJob.create({
    data: {
      bullmqJobId: jobData.bullmqJobId || null,
      type: jobData.type || 'full_pipeline',
      status: 'queued',
      input: jobData.input || null,
      currentStep: 'queued',
      progress: 0,
    },
  });

  console.log(`[Publisher] Created pipeline job: ${job.id} (type: ${job.type})`);
  return job;
}

const { invalidateAllFeedCache, invalidateDomainCache } = require('../services/cacheService');

/**
 * Invalidate feed cache
 * @param {string[]} [domains] - Optional domains to invalidate
 */
async function invalidateFeedCache(domains = null) {
  if (domains && domains.length > 0) {
    console.log(`[Publisher] Cache invalidation requested for domains: ${domains.join(', ')}`);
    for (const domain of domains) {
      await invalidateDomainCache(domain);
    }
    // Selalu invalidate cache feed "Semua" karena kontennya terpengaruh
    await invalidateDomainCache('__all__');
  } else {
    console.log('[Publisher] Global feed cache invalidation requested');
    await invalidateAllFeedCache();
  }
}

module.exports = {
  publishCard,
  publishCards,
  updateJobStatus,
  createPipelineJob,
  invalidateFeedCache,
};

