/**
 * Publisher — Database Publish & Cache Invalidation
 *
 * Menyimpan KnowledgeCard yang sudah lolos fact-check & moderation
 * ke database, dan menghapus cache feed.
 */

import prisma from '../lib/prisma';
import { isAllowedDomain } from './moderator';
import { invalidateAllFeedCache, invalidateDomainCache } from '../services/cacheService';

interface CardData {
  title: string;
  content: string;
  domain?: string;
  tags?: string[];
  type?: string;
  aiModel?: string;
  sourceName?: string;
  sourceUrl?: string | null;
}

interface FactCheckResult {
  verified?: boolean;
  confidence?: number;
}

interface ModerationResult {
  status?: 'approved' | 'review' | 'blocked' | 'pending';
}

interface SourceChunk {
  sourceId: string;
  sourceTitle?: string;
  sourceUrl?: string;
  sourceExternalId?: string;
  sourceType?: string;
  authors?: string[];
  chunkId?: string;
}

/**
 * Publish sebuah knowledge card ke database
 */
export async function publishCard(
  cardData: CardData,
  factCheckResult: FactCheckResult,
  moderationResult: ModerationResult,
  sourceChunks: SourceChunk[] = []
) {
  // Build citations from source chunks
  const citations = sourceChunks
    .filter((c) => c.sourceTitle)
    .reduce<any[]>((acc, chunk) => {
      if (!acc.find((c) => c.sourceId === chunk.sourceId)) {
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

  // ponytail: dedup by title+content hash before insert. LLM sometimes
  // regenerates near-identical cards across pipeline runs; this prevents
  // duplicate rows in the feed. One extra query per card, cheap.
  const contentHash = Buffer.from(
    `${(cardData.title || '').trim()}|||${(cardData.content || '').trim()}`
  ).toString('base64').substring(0, 64);

  const existing = await prisma.knowledgeCard.findFirst({
    where: { title: cardData.title, content: cardData.content },
    select: { id: true },
  });

  if (existing) {
    console.log(`[Publisher] Skipping duplicate card: "${cardData.title}" (existing id: ${existing.id})`);
    return null;
  }

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
      sourceChunkIds: sourceChunks.map((c) => c.chunkId).filter(Boolean) as string[],
      ...(citations.length > 0 ? { citations: citations as any } : {}),
    },
  });

  console.log(
    `[Publisher] Published card: "${card.title}" (id: ${card.id}, fact-checked: ${card.factChecked}, moderation: ${card.moderationStatus})`
  );

  return card;
}

interface CardWithResults {
  cardData: CardData;
  factCheckResult: FactCheckResult;
  moderationResult: ModerationResult;
  sourceChunks?: SourceChunk[];
}

/**
 * Publish multiple cards
 */
export async function publishCards(cardsWithResults: CardWithResults[]) {
  const publishedCards: any[] = [];
  let skippedCount = 0;

  for (const { cardData, factCheckResult, moderationResult, sourceChunks } of cardsWithResults) {
    if (moderationResult.status === 'blocked') {
      console.log(`[Publisher] Skipping blocked card: "${cardData.title}"`);
      skippedCount++;
      continue;
    }

    try {
      const card = await publishCard(cardData, factCheckResult, moderationResult, sourceChunks);
      if (card) publishedCards.push(card);
      else skippedCount++;
    } catch (error: any) {
      console.error(`[Publisher] Failed to publish card "${cardData.title}":`, error.message);
    }
  }

  console.log(`[Publisher] Published ${publishedCards.length} cards, skipped ${skippedCount}`);
  return publishedCards;
}

/**
 * Update pipeline job status
 */
export async function updateJobStatus(jobId: string, update: any) {
  try {
    await prisma.pipelineJob.update({
      where: { id: jobId },
      data: {
        ...update,
        ...(update.status === 'completed' ? { completedAt: new Date() } : {}),
      },
    });
  } catch (error: any) {
    console.error(`[Publisher] Failed to update job ${jobId}:`, error.message);
  }
}

interface CreateJobData {
  bullmqJobId?: string | null;
  type?: string;
  input?: any;
}

/**
 * Create pipeline job record
 */
export async function createPipelineJob(jobData: CreateJobData) {
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

/**
 * Invalidate feed cache
 */
export async function invalidateFeedCache(domains: string[] | null = null) {
  if (domains && domains.length > 0) {
    console.log(`[Publisher] Cache invalidation requested for domains: ${domains.join(', ')}`);
    for (const domain of domains) {
      await invalidateDomainCache(domain);
    }
    await invalidateDomainCache('__all__');
  } else {
    console.log('[Publisher] Global feed cache invalidation requested');
    await invalidateAllFeedCache();
  }
}
