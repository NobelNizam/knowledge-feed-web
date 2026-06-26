const { OpenAI } = require('openai');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Konfigurasi menggunakan Nvidia NIM API
// Nvidia NIM menggunakan endpoint yang kompatibel dengan OpenAI SDK
const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1',
});

// Model default jika tidak ditentukan di .env
const DEFAULT_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';

async function generateKnowledgeCards(count = 5, domains = null) {
  if (!process.env.NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not configured in .env');
  }

  const domainPrompt = domains && domains.length > 0
    ? `PENTING: Pilih HANYA SATU domain dari daftar ini untuk setiap kartu: ${domains.join(', ')}. Jangan menggabungkan dua domain!`
    : `Pilih secara acak HANYA SATU domain dari daftar berikut untuk setiap kartu: sains, sejarah, teknologi, filosofi, seni, alam, psikologi, luar angkasa.`;

  const prompt = `
Buatlah ${count} fakta menarik (knowledge cards) dalam bahasa Indonesia.
${domainPrompt}

Gaya bahasa:
- Santai, seru, dan mudah dicerna (casual, cocok untuk dibaca di sela-sela waktu luang).
- Hindari bahasa yang terlalu baku atau kaku, gunakan bahasa sehari-hari yang sopan dan asyik.

Format Output:
Berikan HANYA array JSON murni (tanpa tag markdown \`\`\`json) dengan format objek berikut:
[
  {
    "title": "Judul Menarik (Singkat)",
    "content": "Isi fakta yang seru dan mudah dipahami, maksimal 2-3 kalimat.",
    "domain": "hanya satu kata tunggal (misal: sains)",
    "tags": ["tag1", "tag2", "tag3"]
  }
]

ATURAN SANGAT PENTING: 
Pastikan Anda mematuhi struktur JSON yang valid! Jika Anda ingin menggunakan tanda kutip di dalam nilai string (seperti di dalam "content"), Anda WAJIB melakukan escape pada tanda kutip tersebut dengan backslash (contoh: \\"kata\\") ATAU gunakan saja tanda kutip tunggal ('kata'). Jika tidak, parsing JSON akan gagal!
`;

  try {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
    });

    const responseContent = completion.choices[0].message.content.trim();
    let cardsData;
    
    try {
      // Cari dan ekstrak string yang merupakan array JSON menggunakan Regex
      const match = responseContent.match(/\[[\s\S]*\]/);
      if (!match) {
        throw new Error('No JSON array found in response');
      }
      cardsData = JSON.parse(match[0]);
    } catch (e) {
      console.error('Failed to parse Nvidia NIM response as JSON:', responseContent);
      throw new Error('Invalid JSON format from AI');
    }

    // Insert into database
    const createdCards = await Promise.all(
      cardsData.map((card) =>
        prisma.knowledgeCard.create({
          data: {
            title: card.title,
            content: card.content,
            domain: card.domain,
            tags: card.tags,
            type: "QUICK_FACT",
            aiModel: DEFAULT_MODEL,
            sourceName: "AI Generated",
          },
        })
      )
    );

    return createdCards;
  } catch (error) {
    console.error('Error generating AI knowledge cards via Nvidia NIM:', error);
    throw error;
  }
}

module.exports = {
  generateKnowledgeCards,
};
