/**
 * Cleaner & Deduplicator
 *
 * Membersihkan teks dari LaTeX, HTML entities, special characters.
 * Mendeteksi duplikasi menggunakan SHA-256 hash.
 */

import crypto from 'crypto';

import prisma from '../lib/prisma';

export function stripLatex(text: string | undefined | null): string {
  if (!text) return '';

  return text
    .replace(/\$\$[\s\S]*?\$\$/g, '[formula]')
    .replace(/\$[^$]+\$/g, '[formula]')
    .replace(/\\begin\{.*?\}[\s\S]*?\\end\{.*?\}/g, '[formula]')
    .replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripHtml(text: string | undefined | null): string {
  if (!text) return '';

  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .trim();
}

export function normalizeText(text: string | undefined | null): string {
  if (!text) return '';

  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function cleanText(text: string | undefined | null): string {
  if (!text) return '';

  let cleaned = text;
  cleaned = stripLatex(cleaned);
  cleaned = stripHtml(cleaned);
  cleaned = normalizeText(cleaned);

  return cleaned;
}

export function generateHash(text: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export async function isDuplicate(externalId: string, contentHash: string): Promise<boolean> {
  const existing = await prisma.knowledgeSource.findFirst({
    where: {
      OR: [{ externalId }, { contentHash }],
    },
  });

  return !!existing;
}

export async function cleanAndDeduplicate(papers: any[]): Promise<any[]> {
  const results: any[] = [];
  let duplicateCount = 0;

  for (const paper of papers) {
    const cleanedTitle = cleanText(paper.title);
    const cleanedAbstract = cleanText(paper.abstract);

    const contentHash = generateHash(`${cleanedTitle} ${cleanedAbstract}`);

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
