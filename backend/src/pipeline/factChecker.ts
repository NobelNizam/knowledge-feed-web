/**
 * Fact-Checker — CrossRef, PubMed, arXiv Validation
 *
 * Memvalidasi klaim dari knowledge card dengan mencocokkan
 * terhadap sumber terpercaya (CrossRef, PubMed, arXiv).
 */

import { fetchPapers } from './crawler';

import prisma from '../lib/prisma';

export const MIN_CONFIDENCE = parseFloat(process.env.FACT_CHECK_MIN_CONFIDENCE || '0.6');

export async function searchCrossRef(query: string): Promise<any[]> {
  try {
    const url = new URL('https://api.crossref.org/works');
    url.searchParams.append('query', query);
    url.searchParams.append('rows', '5');
    url.searchParams.append('select', 'DOI,title,author,URL,published-print,abstract');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'KnowledgeFeedPlatform/1.0 (mailto:noreply@knowledgefeed.app)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: any = await response.json();
    const items = data?.message?.items || [];
    return items.map((item: any) => ({
      sourceType: 'crossref',
      doi: item.DOI,
      title: Array.isArray(item.title) ? item.title[0] : item.title,
      url: item.URL || `https://doi.org/${item.DOI}`,
      authors: (item.author || []).map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()),
      abstract: item.abstract || null,
    }));
  } catch (error: any) {
    console.error('[FactChecker] CrossRef search error:', error.message);
    return [];
  }
}

async function getWithRetry(url: string, params: Record<string, any> = {}, retries = 3, delay = 1000) {
  const urlObj = new URL(url);
  for (const [key, val] of Object.entries(params)) {
    urlObj.searchParams.append(key, String(val));
  }

  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(urlObj.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.status === 429 && i < retries - 1) {
        console.warn(`[FactChecker] Rate limit 429 hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      const isLastAttempt = i === retries - 1;
      if (isLastAttempt) throw error;
      console.warn(`[FactChecker] Request failed: ${error.message}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

export async function searchPubMed(query: string): Promise<any[]> {
  try {
    const searchParams: Record<string, string> = {
      db: 'pubmed',
      term: query,
      retmax: '5',
      retmode: 'json',
    };
    if (process.env.NCBI_API_KEY) {
      searchParams.api_key = process.env.NCBI_API_KEY;
    }

    const searchData: any = await getWithRetry(
      'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
      searchParams
    );

    const ids = searchData?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    const detailParams: Record<string, string> = {
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
    };
    if (process.env.NCBI_API_KEY) {
      detailParams.api_key = process.env.NCBI_API_KEY;
    }

    const detailData: any = await getWithRetry(
      'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi',
      detailParams
    );

    const results = detailData?.result || {};
    return ids
      .filter((id: string) => results[id])
      .map((id: string) => {
        const article = results[id];
        return {
          sourceType: 'pubmed',
          pmid: id,
          title: article.title || '',
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          authors: (article.authors || []).map((a: any) => a.name || ''),
          publishedDate: article.pubdate || null,
        };
      });
  } catch (error: any) {
    console.error('[FactChecker] PubMed search error:', error.message);
    return [];
  }
}

export async function searchArxiv(query: string): Promise<any[]> {
  try {
    const papers = await fetchPapers({ query, maxResults: 5 });
    return papers.map((p) => ({
      sourceType: 'arxiv',
      arxivId: p.arxivId,
      title: p.title,
      url: p.url,
      authors: p.authors,
    }));
  } catch (error: any) {
    console.error('[FactChecker] arXiv search error:', error.message);
    return [];
  }
}

export function calculateRelevance(claim: string, sourceText: string): number {
  if (!claim || !sourceText) return 0;

  const claimWords = claim.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const sourceWords = new Set(sourceText.toLowerCase().split(/\s+/));

  if (claimWords.length === 0) return 0;

  const matchCount = claimWords.filter((w) => sourceWords.has(w)).length;
  return matchCount / claimWords.length;
}

export async function factCheckCard(card: { title: string; content: string; domain?: string }) {
  console.log(`[FactChecker] Checking card: "${card.title}"`);

  const searchQuery = `${card.title} ${card.domain || ''}`.trim();
  const allSources: any[] = [];
  let totalConfidence = 0;

  const [crossRefResults, pubMedResults, arxivResults] = await Promise.all([
    searchCrossRef(searchQuery),
    searchPubMed(searchQuery),
    searchArxiv(searchQuery),
  ]);

  const processResults = (results: any[]) => {
    for (const result of results) {
      const relevance = calculateRelevance(
        `${card.title} ${card.content}`,
        `${result.title} ${result.abstract || ''}`
      );

      if (relevance > 0.2) {
        allSources.push({ ...result, relevance });
        totalConfidence += relevance;
      }
    }
  };

  processResults(crossRefResults);
  processResults(pubMedResults);
  processResults(arxivResults);

  const confidence = allSources.length > 0
    ? Math.min(1.0, totalConfidence / Math.max(allSources.length, 1))
    : 0;

  const verified = confidence >= MIN_CONFIDENCE;

  allSources.sort((a, b) => b.relevance - a.relevance);

  const result = {
    verified,
    confidence: Math.round(confidence * 100) / 100,
    sources: allSources.slice(0, 5),
    details: {
      crossRefCount: crossRefResults.length,
      pubMedCount: pubMedResults.length,
      arxivCount: arxivResults.length,
      totalMatches: allSources.length,
      threshold: MIN_CONFIDENCE,
    },
  };

  console.log(`[FactChecker] Result: verified=${verified}, confidence=${result.confidence}, sources=${allSources.length}`);
  return result;
}

export async function saveFactCheckResults(cardId: string, factCheckResult: any) {
  const records: any[] = [];

  for (const source of factCheckResult.sources) {
    const record = await prisma.factCheckResult.create({
      data: {
        cardId,
        claim: `${source.title}`,
        verified: factCheckResult.verified,
        confidence: source.relevance,
        sourceType: source.sourceType,
        sourceUrl: source.url || null,
        sourceTitle: source.title || null,
        details: source,
      },
    });
    records.push(record);
  }

  await prisma.knowledgeCard.update({
    where: { id: cardId },
    data: {
      factChecked: true,
      factCheckScore: factCheckResult.confidence,
    },
  });

  return records;
}
