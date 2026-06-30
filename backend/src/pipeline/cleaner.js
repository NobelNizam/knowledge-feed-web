/**
 * Cleaner & Deduplicator
 * 
 * Membersihkan teks dari LaTeX, HTML entities, special characters.
 * Mendeteksi duplikasi menggunakan SHA-256 hash.
 */

const crypto = require('crypto');

const prisma = require('../lib/prisma');

/**
 * Strip LaTeX markup dari teks
 * @param {string} text - Input text with potential LaTeX
 * @returns {string} Cleaned text
 */
function stripLatex(text) {
  if (!text) return '';

  return text
    // Remove LaTeX math delimiters
    .replace(/\$\$[\s\S]*?\$\$/g, '[formula]')
    .replace(/\$[^$]+\$/g, '[formula]')
    .replace(/\\begin\{.*?\}[\s\S]*?\\end\{.*?\}/g, '[formula]')
    // Remove LaTeX commands
    .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, '')
    // Remove remaining braces
    .replace(/[{}]/g, '')
    // Clean up
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip HTML entities dan tags
 * @param {string} text - Input text with potential HTML
 * @returns {string} Cleaned text
 */
function stripHtml(text) {
  if (!text) return '';

  return text
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .trim();
}

/**
 * Normalisasi teks untuk cleaning umum
 * @param {string} text - Input text
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text) return '';

  return text
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Full text cleaning pipeline
 * @param {string} text - Raw text to clean
 * @returns {string} Fully cleaned text
 */
function cleanText(text) {
  if (!text) return '';

  let cleaned = text;
  cleaned = stripLatex(cleaned);
  cleaned = stripHtml(cleaned);
  cleaned = normalizeText(cleaned);

  return cleaned;
}

/**
 * Generate SHA-256 hash dari teks (untuk deduplication)
 * @param {string} text - Input text
 * @returns {string} Hex-encoded SHA-256 hash
 */
function generateHash(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Cek apakah paper sudah ada di database (berdasarkan externalId atau content hash)
 * @param {string} externalId - External identifier (e.g., arXiv ID)
 * @param {string} contentHash - SHA-256 hash dari content
 * @returns {Promise<boolean>} true jika sudah ada
 */
async function isDuplicate(externalId, contentHash) {
  const existing = await prisma.knowledgeSource.findFirst({
    where: {
      OR: [
        { externalId },
        { contentHash },
      ],
    },
  });

  return !!existing;
}

/**
 * Clean dan deduplicate array of papers
 * @param {Array<Object>} papers - Raw papers dari crawler
 * @returns {Promise<Array<Object>>} Cleaned and deduplicated papers
 */
async function cleanAndDeduplicate(papers) {
  const results = [];
  let duplicateCount = 0;

  for (const paper of papers) {
    // Clean text fields
    const cleanedTitle = cleanText(paper.title);
    const cleanedAbstract = cleanText(paper.abstract);

    // Generate hash for deduplication
    const contentHash = generateHash(`${cleanedTitle} ${cleanedAbstract}`);

    // Check for duplicates
    const duplicate = await isDuplicate(paper.arxivId, contentHash);
    if (duplicate) {
      duplicateCount++;
      console.log(`[Cleaner] Skipping duplicate: ${paper.arxivId}`);
      continue;
    }

    results.push({
      ...paper,
      title: cleanedTitle,
      abstract: cleanedAbstract,
      contentHash,
      cleanedContent: `${cleanedTitle}\n\n${cleanedAbstract}`,
    });
  }

  console.log(`[Cleaner] Processed ${papers.length} papers: ${results.length} unique, ${duplicateCount} duplicates`);
  return results;
}

module.exports = {
  cleanText,
  stripLatex,
  stripHtml,
  normalizeText,
  generateHash,
  isDuplicate,
  cleanAndDeduplicate,
};

