/**
 * Crawler — arXiv Paper Fetcher
 * 
 * Mengambil paper dari arXiv REST API berdasarkan query topics.
 * Rate limited: 1 request per 3 detik (sesuai arXiv policy).
 */

const axios = require('axios');
const xml2js = require('xml2js');

const ARXIV_API_URL = 'http://export.arxiv.org/api/query';
const RATE_LIMIT_MS = 3000; // arXiv policy: max 1 request per 3 seconds

let lastRequestTime = 0;

/**
 * Rate limiter untuk arXiv API
 */
async function rateLimitWait() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Parse arXiv XML response ke array of paper objects
 * @param {string} xmlData - Raw XML dari arXiv API
 * @returns {Array<Object>} Array of parsed papers
 */
async function parseArxivResponse(xmlData) {
  const parser = new xml2js.Parser({ explicitArray: false, trim: true });
  const result = await parser.parseStringPromise(xmlData);

  const feed = result.feed;
  if (!feed || !feed.entry) {
    return [];
  }

  // arXiv bisa return single entry (object) atau array
  const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];

  return entries.map(entry => {
    // Extract arXiv ID dari entry.id URL
    const arxivIdMatch = entry.id ? entry.id.match(/abs\/(.+)$/) : null;
    const arxivId = arxivIdMatch ? arxivIdMatch[1] : entry.id;

    // Extract authors
    const authorData = entry.author
      ? (Array.isArray(entry.author) ? entry.author : [entry.author])
      : [];
    const authors = authorData.map(a => a.name || '').filter(Boolean);

    // Extract PDF link
    const links = entry.link
      ? (Array.isArray(entry.link) ? entry.link : [entry.link])
      : [];
    const pdfLink = links.find(l => l.$ && l.$.title === 'pdf');
    const pdfUrl = pdfLink ? pdfLink.$.href : null;

    // Extract primary category
    const primaryCategory = entry['arxiv:primary_category']
      ? entry['arxiv:primary_category'].$.term
      : (entry.category ? (entry.category.$ ? entry.category.$.term : '') : '');

    // Extract published date
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

/**
 * Fetch papers dari arXiv API
 * @param {Object} options
 * @param {string} options.query - Search query (e.g., "machine learning")
 * @param {number} [options.maxResults=10] - Maximum number of results
 * @param {number} [options.start=0] - Start index for pagination
 * @param {string} [options.sortBy='submittedDate'] - Sort criteria
 * @param {string} [options.sortOrder='descending'] - Sort order
 * @returns {Promise<Array<Object>>} Array of paper objects
 */
async function fetchPapers({ query, maxResults = 10, start = 0, sortBy = 'submittedDate', sortOrder = 'descending' }) {
  await rateLimitWait();

  try {
    console.log(`[Crawler] Fetching arXiv papers for query: "${query}" (max: ${maxResults})`);
    
    // Optimasi: Kurangi timeout menjadi 5000ms agar tidak blocking terlalu lama
    // saat ArXiv down atau rate limit (bisa fallback ke direct gen).
    const response = await axios.get('http://export.arxiv.org/api/query', {
      params: {
        search_query: `all:${query}`,
        start: 0,
        max_results: maxResults,
        sortBy: 'submittedDate',
        sortOrder: 'descending'
      },
      timeout: 5000 // Reduced from 30000ms to 5000ms
    });const papers = await parseArxivResponse(response.data);
    console.log(`[Crawler] Fetched ${papers.length} papers from arXiv`);
    return papers;
  } catch (error) {
    console.error('[Crawler] Error fetching from arXiv:', error.message);
    throw new Error(`arXiv fetch failed: ${error.message}`);
  }
}

/**
 * Fetch papers untuk multiple topics
 * @param {string[]} topics - Array of topic queries
 * @param {number} [papersPerTopic=5] - Papers to fetch per topic
 * @returns {Promise<Array<Object>>} All fetched papers
 */
async function fetchMultipleTopics(topics, maxPerTopic = 3) {
  let allPapers = [];
  
  // Paralelkan pencarian untuk mempercepat, dan tangani kegagalan dengan cepat
  const results = await Promise.all(
    topics.map(async (topic) => {
      try {
        return await fetchPapers({ query: topic, maxResults: maxPerTopic });
      } catch (error) {
        console.warn(`[Crawler] Failed to fetch topic "${topic}":`, error.message);
        return [];
      }
    })
  );

  for (const papers of results) {
    allPapers = [...allPapers, ...papers];
  }

  // Remove duplicates based on arXiv ID
  const uniquePapers = Array.from(new Map(allPapers.map(p => [p.arxivId, p])).values());
  
  console.log(`[Crawler] Total papers fetched: ${uniquePapers.length} from ${topics.length} topics`);
  return uniquePapers;
}

/**
 * Get default topics dari environment variable
 * @returns {string[]} Array of topic strings
 */
function getDefaultTopics() {
  const envTopics = process.env.ARXIV_QUERY_TOPICS;
  if (envTopics) {
    return envTopics.split(',').map(t => t.trim()).filter(Boolean);
  }
  return ['machine learning', 'artificial intelligence', 'computer science'];
}

module.exports = {
  fetchPapers,
  fetchMultipleTopics,
  getDefaultTopics,
  parseArxivResponse,
};
