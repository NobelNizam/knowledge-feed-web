/**
 * Fact-Checker — CrossRef, PubMed, arXiv Validation
 * 
 * Memvalidasi klaim dari knowledge card dengan mencocokkan
 * terhadap sumber terpercaya (CrossRef, PubMed, arXiv).
 */

const { fetchPapers } = require('./crawler');

const prisma = require('../lib/prisma');

const MIN_CONFIDENCE = parseFloat(process.env.FACT_CHECK_MIN_CONFIDENCE) || 0.6;

/**
 * Search CrossRef API untuk paper terkait
 * @param {string} query - Search query (biasanya klaim atau judul)
 * @returns {Promise<Array<Object>>} Matching works
 */
async function searchCrossRef(query) {
  try {
    const url = new URL('https://api.crossref.org/works');
    url.searchParams.append('query', query);
    url.searchParams.append('rows', '5');
    url.searchParams.append('select', 'DOI,title,author,URL,published-print,abstract');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // ponytail: timeout 15s

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'KnowledgeFeedPlatform/1.0 (mailto:noreply@knowledgefeed.app)',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const items = data?.message?.items || [];
    return items.map(item => ({
      sourceType: 'crossref',
      doi: item.DOI,
      title: Array.isArray(item.title) ? item.title[0] : item.title,
      url: item.URL || `https://doi.org/${item.DOI}`,
      authors: (item.author || []).map(a => `${a.given || ''} ${a.family || ''}`.trim()),
      abstract: item.abstract || null,
    }));
  } catch (error) {
    console.error('[FactChecker] CrossRef search error:', error.message);
    return [];
  }
}

// Helper to perform GET request with retry on 429 (Rate Limit) using native fetch
async function getWithRetry(url, params = {}, retries = 3, delay = 1000) {
  const urlObj = new URL(url);
  for (const [key, val] of Object.entries(params)) {
    urlObj.searchParams.append(key, String(val));
  }

  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // ponytail: timeout 15s

    try {
      const response = await fetch(urlObj.toString(), {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 429 && i < retries - 1) {
        console.warn(`[FactChecker] Rate limit 429 hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      const isLastAttempt = i === retries - 1;
      if (isLastAttempt) throw error;
      
      console.warn(`[FactChecker] Request failed: ${error.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

/**
 * Search PubMed API untuk paper biomedis
 * @param {string} query - Search query
 * @returns {Promise<Array<Object>>} Matching articles
 */
async function searchPubMed(query) {
  try {
    const searchParams = {
      db: 'pubmed',
      term: query,
      retmax: '5',
      retmode: 'json',
    };
    if (process.env.NCBI_API_KEY) {
      searchParams.api_key = process.env.NCBI_API_KEY;
    }

    // Step 1: Search for IDs
    const searchData = await getWithRetry(
      'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
      searchParams
    );

    const ids = searchData?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    const detailParams = {
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
    };
    if (process.env.NCBI_API_KEY) {
      detailParams.api_key = process.env.NCBI_API_KEY;
    }

    // Step 2: Fetch details
    const detailData = await getWithRetry(
      'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi',
      detailParams
    );

    const results = detailData?.result || {};
    return ids
      .filter(id => results[id])
      .map(id => {
        const article = results[id];
        return {
          sourceType: 'pubmed',
          pmid: id,
          title: article.title || '',
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          authors: (article.authors || []).map(a => a.name || ''),
          publishedDate: article.pubdate || null,
        };
      });
  } catch (error) {
    console.error('[FactChecker] PubMed search error:', error.message);
    return [];
  }
}

/**
 * Search arXiv API untuk paper terkait
 * @param {string} query - Search query
 * @returns {Promise<Array<Object>>} Matching papers
 */
async function searchArxiv(query) {
  try {
    const papers = await fetchPapers({ query, maxResults: 5 });
    return papers.map(p => ({
      sourceType: 'arxiv',
      arxivId: p.arxivId,
      title: p.title,
      url: p.url,
      authors: p.authors,
    }));
  } catch (error) {
    console.error('[FactChecker] arXiv search error:', error.message);
    return [];
  }
}

/**
 * Hitung relevance score berdasarkan keyword overlap
 * @param {string} claim - The claim to check
 * @param {string} sourceText - Source text to compare against
 * @returns {number} Relevance score (0.0 - 1.0)
 */
function calculateRelevance(claim, sourceText) {
  if (!claim || !sourceText) return 0;

  const claimWords = claim.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const sourceWords = new Set(sourceText.toLowerCase().split(/\s+/));

  if (claimWords.length === 0) return 0;

  const matchCount = claimWords.filter(w => sourceWords.has(w)).length;
  return matchCount / claimWords.length;
}

/**
 * Fact-check sebuah knowledge card
 * @param {Object} card - Knowledge card object { title, content, domain, citations }
 * @returns {Promise<Object>} Fact check result
 */
async function factCheckCard(card) {
  console.log(`[FactChecker] Checking card: "${card.title}"`);

  const searchQuery = `${card.title} ${card.domain || ''}`.trim();
  const allSources = [];
  let totalConfidence = 0;

  // Search all three sources in parallel
  const [crossRefResults, pubMedResults, arxivResults] = await Promise.all([
    searchCrossRef(searchQuery),
    searchPubMed(searchQuery),
    searchArxiv(searchQuery),
  ]);

  // Calculate relevance for each source
  const processResults = (results) => {
    for (const result of results) {
      const relevance = calculateRelevance(
        `${card.title} ${card.content}`,
        `${result.title} ${result.abstract || ''}`
      );

      if (relevance > 0.2) {
        allSources.push({
          ...result,
          relevance,
        });
        totalConfidence += relevance;
      }
    }
  };

  processResults(crossRefResults);
  processResults(pubMedResults);
  processResults(arxivResults);

  // Normalize confidence score
  const confidence = allSources.length > 0
    ? Math.min(1.0, totalConfidence / Math.max(allSources.length, 1))
    : 0;

  const verified = confidence >= MIN_CONFIDENCE;

  // Sort sources by relevance
  allSources.sort((a, b) => b.relevance - a.relevance);

  const result = {
    verified,
    confidence: Math.round(confidence * 100) / 100,
    sources: allSources.slice(0, 5), // Top 5 sources
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

/**
 * Save fact check results ke database
 * @param {string} cardId - KnowledgeCard ID
 * @param {Object} factCheckResult - Result dari factCheckCard()
 * @returns {Promise<Array<Object>>} Created FactCheckResult records
 */
async function saveFactCheckResults(cardId, factCheckResult) {
  const records = [];

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

  // Update card with fact check status
  await prisma.knowledgeCard.update({
    where: { id: cardId },
    data: {
      factChecked: true,
      factCheckScore: factCheckResult.confidence,
    },
  });

  return records;
}

module.exports = {
  factCheckCard,
  saveFactCheckResults,
  searchCrossRef,
  searchPubMed,
  searchArxiv,
  calculateRelevance,
  MIN_CONFIDENCE,
};

