/**
 * Crawler — arXiv Paper Fetcher
 *
 * Mengambil paper dari arXiv REST API berdasarkan query topics.
 * Rate limited: 1 request per 3 detik (sesuai arXiv policy).
 */

import xml2js from 'xml2js';

const ARXIV_API_URL = 'https://export.arxiv.org/api/query';
const RATE_LIMIT_MS = 3000; // arXiv policy: max 1 request per 3 seconds

let lastRequestTime = 0;

interface Paper {
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  category: string;
  url: string;
  pdfUrl: string | null;
  publishedDate: Date | null;
}

async function rateLimitWait(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

async function parseArxivResponse(xmlData: string): Promise<Paper[]> {
  const parser = new xml2js.Parser({ explicitArray: false, trim: true });
  const result = await parser.parseStringPromise(xmlData);

  const feed = result.feed;
  if (!feed || !feed.entry) {
    return [];
  }

  const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];

  return entries.map((entry: any) => {
    const arxivIdMatch = entry.id ? entry.id.match(/abs\/(.+)$/) : null;
    const arxivId = arxivIdMatch ? arxivIdMatch[1] : entry.id;

    const authorData = entry.author
      ? (Array.isArray(entry.author) ? entry.author : [entry.author])
      : [];
    const authors = authorData.map((a: any) => a.name || '').filter(Boolean);

    const links = entry.link
      ? (Array.isArray(entry.link) ? entry.link : [entry.link])
      : [];
    const pdfLink = links.find((l: any) => l.$ && l.$.title === 'pdf');
    const pdfUrl = pdfLink ? pdfLink.$.href : null;

    const primaryCategory = entry['arxiv:primary_category']
      ? entry['arxiv:primary_category'].$.term
      : entry.category
        ? (entry.category.$ ? entry.category.$.term : '')
        : '';

    const publishedDate = entry.published ? new Date(entry.published) : null;

    return {
      arxivId: arxivId || '',
      title: (entry.title || '').replace(/\s+/g, ' ').trim(),
      abstract: (entry.summary || '').replace(/\s+/g, ' ').trim(),
      authors,
      category: primaryCategory,
      url: entry.id || '',
      pdfUrl,
      publishedDate,
    };
  });
}

interface FetchOptions {
  query: string;
  maxResults?: number;
  start?: number;
  sortBy?: string;
  sortOrder?: string;
}

export async function fetchPapers({
  query,
  maxResults = 10,
  start = 0,
  sortBy = 'submittedDate',
  sortOrder = 'descending',
}: FetchOptions): Promise<Paper[]> {
  await rateLimitWait();

  try {
    console.log(`[Crawler] Fetching arXiv papers for query: "${query}" (max: ${maxResults})`);

    const url = new URL(ARXIV_API_URL);
    url.searchParams.append('search_query', `all:${query}`);
    url.searchParams.append('start', '0');
    url.searchParams.append('max_results', String(maxResults));
    url.searchParams.append('sortBy', 'submittedDate');
    url.searchParams.append('sortOrder', 'descending');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlData = await response.text();
    const papers = await parseArxivResponse(xmlData);
    console.log(`[Crawler] Fetched ${papers.length} papers from arXiv`);
    return papers;
  } catch (error: any) {
    const isTimeout = error.name === 'AbortError';
    const errMsg = isTimeout ? 'Request timed out after 5s' : error.message;
    console.error('[Crawler] Error fetching from arXiv:', errMsg);
    throw new Error(`arXiv fetch failed: ${errMsg}`);
  }
}

export async function fetchMultipleTopics(topics: string[], maxPerTopic = 3): Promise<Paper[]> {
  let allPapers: Paper[] = [];

  for (const topic of topics) {
    try {
      const papers = await fetchPapers({ query: topic, maxResults: maxPerTopic });
      allPapers = [...allPapers, ...papers];
    } catch (error: any) {
      console.warn(`[Crawler] Failed to fetch topic "${topic}":`, error.message);
    }
  }

  const uniquePapers = Array.from(new Map(allPapers.map((p) => [p.arxivId, p])).values());

  console.log(`[Crawler] Total papers fetched: ${uniquePapers.length} from ${topics.length} topics`);
  return uniquePapers;
}

export function getDefaultTopics(): string[] {
  const envTopics = process.env.ARXIV_QUERY_TOPICS;
  if (envTopics) {
    return envTopics.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [
    'Artificial Intelligence',
    'Physics',
    'Biology',
    'Economics',
    'Psychology',
    'Mathematics',
    'Climate Science',
    'Data Science',
  ];
}

export { parseArxivResponse };
