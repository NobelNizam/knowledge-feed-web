/**
 * AI Generator — RAG-Aware Knowledge Card Generator
 *
 * Menghasilkan knowledge cards menggunakan NVIDIA NIM LLM
 * dengan context dari RAG retriever.
 */

import { OpenAI } from 'openai';
import prisma from '../lib/prisma';
import { getAllLevel2 } from '../services/domainHierarchy';

// Primary NVIDIA NIM client — timeout 3 menit karena Llama 70B inference bisa lambat
// lewat network free-tier (Render/Vercel ke Nvidia).
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  timeout: 3 * 60 * 1000,
  maxRetries: 2,
});

const DEFAULT_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';

const ALLOWED_DOMAINS: string[] = getAllLevel2();

// ponytail: NVIDIA free-tier input limit is 4096 tokens. Llama tokenizer
// averages 1 token ≈ 3.5 chars for Indo/EN mixed. 3000 chars ≈ 3500 tokens
// leaves safe margin.
const MAX_PROMPT_CHARS = 3000;

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
}

function fuzzyMatchDomain(raw: string, candidates: string[]): string | null {
  const norm = raw.trim();
  const exact = candidates.find((c) => c.toLowerCase() === norm.toLowerCase());
  if (exact) return exact;
  const contains = candidates.find((c) =>
    norm.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(norm.toLowerCase())
  );
  return contains || null;
}

interface RAGOptions {
  count?: number;
  domains?: string[] | null;
  subtopicMap?: Record<string, string[]> | null;
  context?: string;
  citations?: any[];
}

interface RawCard {
  title: string;
  content: string;
  domain: string;
  tags?: string[];
  citations?: string[];
}

function buildPrompt(opts: {
  count: number;
  domainListForPrompt: string[];
  subtopicMap: Record<string, string[]> | null;
  context: string;
  maxContextChars: number;
}): string {
  const { count, domainListForPrompt, subtopicMap, context, maxContextChars } = opts;

  const domainPrompt = `PENTING: Setiap kartu HARUS menggunakan domain "domain" yang HANYA berasal dari daftar disiplin ilmu (Level 2) berikut — PERSIS SAMA, huruf besar/kecil mengikuti aslinya: ${domainListForPrompt.join(', ')}. JANGAN membuat domain baru. JANGAN menggunakan "General", "Other", atau nama domain di luar daftar ini. Setiap kartu cukup SATU domain.`;

  let subtopicPrompt = '';
  if (subtopicMap && Object.keys(subtopicMap).length > 0) {
    const lines = Object.entries(subtopicMap).map(([discipline, subtopics]) => {
      return `- Untuk disiplin "${discipline}", fokuskan konten pada sub-topik berikut: ${(subtopics as string[]).join(', ')}.`;
    });
    subtopicPrompt = `\nSUB-TOPIK SPESIFIK (Level 3):\n${lines.join('\n')}\nINSTRUKSI: Buat konten yang spesifik membahas sub-topik di atas. Gunakan nama sub-topik sebagai salah satu nilai "tags" pada setiap kartu.\n`;
  }

  let contextPrompt = '';
  if (context && maxContextChars > 0) {
    const truncated = context.length > maxContextChars
      ? context.substring(0, maxContextChars) + '\n... [dipotong]'
      : context;
    contextPrompt = `\nKONTEKS REFERENSI:\n${truncated}\n\nINSTRUKSI: Buat konten berdasarkan konteks referensi di atas. Sertakan kutipan sumber.`;
  }

  const base = `Buatlah ${count} fakta menarik (knowledge cards) dalam bahasa Indonesia.
${domainPrompt}
${subtopicPrompt}
${contextPrompt}

Gaya bahasa:
- Santai, seru, dan mudah dicerna.
- Hindari bahasa yang terlalu baku, gunakan bahasa sehari-hari yang sopan.

Format Output:
Berikan HANYA array JSON murni (tanpa tag markdown) dengan format:
[
  {
    "title": "Judul Singkat",
    "content": "Isi fakta seru 2-3 kalimat.",
    "domain": "NamaDisiplinLevel2",
    "tags": ["sub-topik", "key2"],
    "citations": ["Judul sumber"]
  }
]
PENTING: Gunakan tanda kutip tunggal ('kata') alih-alih ganda di dalam nilai string untuk menghindari JSON rusak.`;

  return base;
}

function extractJSON(text: string): string | null {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) return match[0];

  const salvage = cleaned.match(/\[\s*\{[\s\S]*\}/);
  if (salvage) return salvage[0] + ']';

  return null;
}

function parseCards(text: string): RawCard[] | null {
  const jsonStr = extractJSON(text);
  if (!jsonStr) return null;
  try {
    return JSON.parse(jsonStr);
  } catch {
    try {
      const repaired = jsonStr.replace(/(?<!\\)"([^"]*)"/g, (_m, inner) => {
        return `"${inner.replace(/"/g, '\\"')}"`;
      });
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

function validateDomains(cards: RawCard[], validDomains: string[]): RawCard[] {
  return cards.map((card) => {
    let domain = card.domain || validDomains[0];
    const match = fuzzyMatchDomain(domain, validDomains);
    if (!match) {
      console.warn(`[AIGenerator] Domain "${domain}" not in allowed list, replacing with "${validDomains[0]}"`);
      domain = validDomains[0];
    } else {
      domain = match;
    }
    return { ...card, domain };
  });
}

/**
 * Generate knowledge cards dengan RAG context
 */
export async function generateWithRAG({
  count = 5,
  domains = null,
  subtopicMap = null,
  context = '',
  citations: _citations = [],
}: RAGOptions = {}): Promise<any[]> {
  if (!process.env.NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not configured in .env');
  }

  const effectiveDomains = domains && domains.length > 0 ? domains : ALLOWED_DOMAINS;

  const domainListForPrompt = effectiveDomains.length <= 15
    ? effectiveDomains
    : pickRandom(effectiveDomains, 15);

  // Hitung budget konteks: bangun prompt tanpa konteks dulu, sisanya untuk RAG context
  const promptWithoutCtx = buildPrompt({
    count,
    domainListForPrompt,
    subtopicMap: subtopicMap || null,
    context: '',
    maxContextChars: 0,
  });
  const maxContextChars = Math.max(0, MAX_PROMPT_CHARS - promptWithoutCtx.length - 100);

  const prompt = buildPrompt({
    count,
    domainListForPrompt,
    subtopicMap: subtopicMap || null,
    context,
    maxContextChars,
  });

  const makeCall = async () => {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4096,
    });
    return (completion.choices[0].message.content || '').trim();
  };

  let responseContent = await makeCall();
  let cardsData = parseCards(responseContent);

  if (!cardsData) {
    console.error('[AIGenerator] First attempt failed to parse. Retrying...');
    responseContent = await makeCall();
    cardsData = parseCards(responseContent);
  }

  if (!cardsData) {
    const preview = responseContent.substring(0, 500);
    console.error(`[AIGenerator] All parse attempts failed. Raw: ${preview}`);
    throw new Error('Invalid JSON format from AI');
  }

  cardsData = validateDomains(cardsData, effectiveDomains);

  return cardsData.map((card) => ({
    title: card.title,
    content: card.content,
    domain: card.domain,
    tags: card.tags || [],
    type: 'QUICK_FACT',
    aiModel: DEFAULT_MODEL,
    sourceName: context ? 'AI Generated (RAG)' : 'AI Generated',
    cardCitations: card.citations || [],
  }));
}

/**
 * Legacy function: Generate dan langsung simpan ke DB (backward compatible)
 */
export async function generateKnowledgeCards(count = 5, domains: string[] | null = null) {
  const cardsData = await generateWithRAG({ count, domains });

  const createdCards = await Promise.all(
    cardsData.map(async (card) => {
      const resolvedDomain = await prisma.domain.upsert({
        where: { name: card.domain },
        update: {},
        create: { name: card.domain },
      });

      return prisma.knowledgeCard.create({
        data: {
          title: card.title,
          content: card.content,
          domainId: resolvedDomain.id,
          type: card.type,
          aiModel: card.aiModel,
          sourceName: card.sourceName,
          hashtags: {
            create: (card.tags || []).map((tagName: string) => ({
              tag: {
                connectOrCreate: {
                  where: { name: tagName },
                  create: { name: tagName, domainId: resolvedDomain.id },
                },
              },
            })),
          },
        },
      });
    })
  );

  return createdCards;
}
