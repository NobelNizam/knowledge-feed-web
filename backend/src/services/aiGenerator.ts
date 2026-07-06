/**
 * AI Generator — RAG-Aware Knowledge Card Generator
 *
 * Menghasilkan knowledge cards menggunakan NVIDIA NIM LLM
 * dengan context dari RAG retriever.
 */

import { OpenAI } from 'openai';
import prisma from '../lib/prisma';

// Primary NVIDIA NIM client
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1',
});

const DEFAULT_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';

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

  const domainPrompt = domains && domains.length > 0
    ? `PENTING: Pilih HANYA SATU disiplin ilmu (Level 2) dari daftar ini untuk setiap kartu: ${domains.join(', ')}. Jangan menggabungkan atau memodifikasi nama disiplin tersebut!`
    : `Pilih secara acak HANYA SATU disiplin ilmu (Level 2) akademis formal dalam Bahasa Inggris untuk setiap kartu (contoh: "Physics", "Artificial Intelligence", "Microbiology", "Astronomy", "Theoretical Computer Science", "Economics", "Psychology", "Linguistics", "Agriculture", "Philosophy", "History"). Pastikan nama disiplin ditulis dalam bahasa Inggris baku dengan huruf kapital di awal setiap kata.`;

  // Build sub-topic prompt jika subtopicMap tersedia (dari hierarki Level 3)
  let subtopicPrompt = '';
  if (subtopicMap && Object.keys(subtopicMap).length > 0) {
    const lines = Object.entries(subtopicMap).map(([discipline, subtopics]) => {
      return `- Untuk disiplin "${discipline}", fokuskan konten pada sub-topik berikut: ${(subtopics as string[]).join(', ')}.`;
    });
    subtopicPrompt = `\nSUB-TOPIK SPESIFIK (Level 3):\n${lines.join('\n')}\nINSTRUKSI: Buat konten yang spesifik membahas sub-topik di atas. Gunakan nama sub-topik sebagai salah satu nilai "tags" pada setiap kartu.\n`;
  }

  const contextPrompt = context
    ? `\nKONTEKS REFERENSI (gunakan informasi ini sebagai sumber utama):\n${context}\n\nINSTRUKSI PENTING: Buat konten berdasarkan konteks referensi di atas. Setiap fakta HARUS berdasarkan informasi dari referensi yang disediakan. Sertakan kutipan sumber jika memungkinkan.`
    : '';

  const prompt = `
Buatlah ${count} fakta menarik (knowledge cards) dalam bahasa Indonesia.
${domainPrompt}
${subtopicPrompt}
${contextPrompt}

Gaya bahasa:
- Santai, seru, dan mudah dicerna (casual, cocok untuk dibaca di sela-sela waktu luang).
- Hindari bahasa yang terlalu baku atau kaku, gunakan bahasa sehari-hari yang sopan dan asyik.
- Jika ada kutipan sumber, sebutkan secara natural di dalam konten.

Format Output:
Berikan HANYA array JSON murni (tanpa tag markdown \`\`\`json) dengan format objek berikut:
[
  {
    "title": "Judul Menarik (Singkat)",
    "content": "Isi fakta yang seru dan mudah dipahami, maksimal 2-3 kalimat. Sertakan referensi jika berdasarkan sumber ilmiah.",
    "domain": "Nama disiplin ilmu Level 2 dalam Bahasa Inggris baku (misal: Physics, Artificial Intelligence, Linguistics)",
    "tags": ["sub-topik Level 3 yang relevan", "tag2", "tag3"],
    "citations": ["Judul sumber yang dikutip (jika ada)"]
  }
]

ATURAN SANGAT PENTING:
Pastikan Anda mematuhi struktur JSON yang valid! Jika Anda ingin menggunakan tanda kutip di dalam nilai string (seperti di dalam "content"), Anda WAJIB melakukan escape pada tanda kutip tersebut dengan backslash (contoh: \\\\"kata\\\\") ATAU gunakan saja tanda kutip tunggal ('kata'). Jika tidak, parsing JSON akan gagal!
`;

  const makeCall = (model: string) => async () => {
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    });
    return (completion.choices[0].message.content || '').trim();
  };

  const responseContent = await makeCall(DEFAULT_MODEL)();

  let cardsData: RawCard[];
  try {
    const match = responseContent.match(/\[[\s\S]*\]/);
    if (!match) {
      throw new Error('No JSON array found in response');
    }
    cardsData = JSON.parse(match[0]);
  } catch (e) {
    console.error('[AIGenerator] Failed to parse response as JSON:', responseContent);
    throw new Error('Invalid JSON format from AI');
  }

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
    cardsData.map((card) =>
      prisma.knowledgeCard.create({
        data: {
          title: card.title,
          content: card.content,
          domain: card.domain,
          tags: card.tags,
          type: card.type,
          aiModel: card.aiModel,
          sourceName: card.sourceName,
        },
      })
    )
  );

  return createdCards;
}
