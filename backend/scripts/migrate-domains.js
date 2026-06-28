/**
 * Database Migration Script
 * 
 * Memetakan domain lama di tabel `knowledge_cards` (domain) 
 * dan `user_preferences` (domains) ke Level 2 (Disciplines / Disiplin Ilmu)
 * sesuai standar terbaru di DomainKnowledge.md.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DOMAIN_MAPPING = {
  // Padanan Utama (Bahasa Indonesia ke Inggris Level 2)
  'pertanian': 'Agriculture',
  'teknologi': 'Computer Engineering',
  'coding': 'Theoretical Computer Science',
  'bahasa': 'Linguistics',
  'seni': 'Visual Arts',
  'kesehatan': 'Public Health',
  'sosiologi': 'Sociology',
  'psikologi': 'Psychology',
  'luar angkasa': 'Astronomy',
  'sains': 'Physics',
  'alam': 'Environmental Science',

  // Padanan Tambahan / Alternatif (Bahasa Inggris Lama)
  'science': 'Physics',
  'history': 'History',
  'technology': 'Computer Engineering',
  'philosophy': 'Philosophy',
  'art': 'Visual Arts',
  'arts': 'Visual Arts',
  'nature': 'Environmental Science',
  'space': 'Astronomy',
  'mathematics': 'Mathematics',
  'health': 'Public Health',
  'social': 'Sociology',
  'economics': 'Economics',
  'education': 'Education',
  'machine learning': 'Artificial Intelligence',
  'artificial intelligence': 'Artificial Intelligence',
  'computer science': 'Theoretical Computer Science',
  'physics': 'Physics',
  'biology': 'Biology',
  'chemistry': 'Chemistry'
};

async function main() {
  console.log('=== Memulai Migrasi Domain ke Level 2 (Disciplines) ===\n');

  // 1. Migrasi tabel knowledge_cards (kolom domain)
  console.log('1. Memproses knowledge_cards...');
  let totalCardsUpdated = 0;
  for (const [oldDomain, newDomain] of Object.entries(DOMAIN_MAPPING)) {
    // Cari case-insensitive
    const affectedCards = await prisma.knowledgeCard.findMany({
      where: {
        domain: {
          equals: oldDomain,
          mode: 'insensitive'
        }
      }
    });

    if (affectedCards.length > 0) {
      const result = await prisma.knowledgeCard.updateMany({
        where: {
          domain: {
            equals: oldDomain,
            mode: 'insensitive'
          }
        },
        data: {
          domain: newDomain
        }
      });
      console.log(` - Mengubah ${result.count} kartu berdomain "${oldDomain}" menjadi "${newDomain}"`);
      totalCardsUpdated += result.count;
    }
  }
  console.log(`Total knowledge_cards diupdate: ${totalCardsUpdated}\n`);

  // 2. Migrasi tabel user_preferences (array domains)
  console.log('2. Memproses user_preferences...');
  const preferences = await prisma.userPreferences.findMany();
  let totalPrefsUpdated = 0;

  for (const pref of preferences) {
    let hasChanges = false;
    const newDomains = pref.domains.map(d => {
      const mapped = DOMAIN_MAPPING[d.toLowerCase()];
      if (mapped) {
        hasChanges = true;
        return mapped;
      }
      return d;
    });

    if (hasChanges) {
      await prisma.userPreferences.update({
        where: { id: pref.id },
        data: {
          domains: newDomains
        }
      });
      console.log(` - Mengubah preferensi user ID ${pref.userId}: [${pref.domains.join(', ')}] -> [${newDomains.join(', ')}]`);
      totalPrefsUpdated++;
    }
  }
  console.log(`Total user_preferences diupdate: ${totalPrefsUpdated}\n`);

  console.log('=== Migrasi Berhasil Diselesaikan ===');
}

main()
  .catch(e => {
    console.error('Terjadi kesalahan saat migrasi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
