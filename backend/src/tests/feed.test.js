const request = require('supertest');
const { app, prisma } = require('../index');
const { invalidateAllFeedCache } = require('../services/cacheService');

describe('Feed and Filter Endpoints', () => {
  let mockCards = [];
  let domainScience, domainHistory, domainTechnology;

  beforeAll(async () => {
    // Bersihkan cache sebelum test
    await invalidateAllFeedCache();

    // Resolve domain IDs for v2 schema
    [domainScience, domainHistory, domainTechnology] = await Promise.all([
      prisma.domain.upsert({ where: { name: 'science' }, update: {}, create: { name: 'science' } }),
      prisma.domain.upsert({ where: { name: 'history' }, update: {}, create: { name: 'history' } }),
      prisma.domain.upsert({ where: { name: 'technology' }, update: {}, create: { name: 'technology' } }),
    ]);

    // Buat data tiruan untuk pengetesan jika database kosong
    const count = await prisma.knowledgeCard.count();
    if (count < 5) {
      mockCards = await Promise.all([
        prisma.knowledgeCard.create({
          data: {
            title: 'Test Science Post',
            content: 'Science content detail here.',
            domainId: domainScience.id,
            type: 'QUICK_FACT'
          }
        }),
        prisma.knowledgeCard.create({
          data: {
            title: 'Test History Post',
            content: 'History content detail here.',
            domainId: domainHistory.id,
            type: 'QUICK_FACT'
          }
        }),
        prisma.knowledgeCard.create({
          data: {
            title: 'Test Technology Post',
            content: 'Tech content detail here.',
            domainId: domainTechnology.id,
            type: 'QUICK_FACT'
          }
        })
      ]);
    } else {
      mockCards = await prisma.knowledgeCard.findMany({ take: 3 });
    }
  });

  afterAll(async () => {
    // Hapus data mock yang kita buat jika ada yang baru
    const idsToDelete = mockCards.map(c => c.id);
    // Hati-hati jangan menghapus data asli, hanya hapus jika kita buat baru di test
    const count = await prisma.knowledgeCard.count();
    if (count <= 3) {
      await prisma.knowledgeCard.deleteMany({
        where: {
          id: { in: idsToDelete }
        }
      });
    }
    await invalidateAllFeedCache();
    await prisma.$disconnect();
  });

  it('should get feed global (all domain) successfully', async () => {
    const res = await request(app)
      .get('/api/feed?limit=5');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBeTruthy();
  });

  it('should filter feed by domain successfully', async () => {
    const domainToTest = 'science';
    const res = await request(app)
      .get(`/api/feed?domains=${domainToTest}&limit=5`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    res.body.data.forEach(card => {
      expect(card.domain.toLowerCase()).toEqual(domainToTest.toLowerCase());
    });
  });

  it('should exclude seenIds successfully', async () => {
    const firstRes = await request(app).get('/api/feed?limit=3');
    const cardsInFeed = firstRes.body.data;
    
    if (cardsInFeed && cardsInFeed.length > 0) {
      const seenId = cardsInFeed[0].id;
      
      const secondRes = await request(app)
        .get(`/api/feed?seenIds=${seenId}&limit=5`);
      
      expect(secondRes.statusCode).toEqual(200);
      const secondIds = secondRes.body.data.map(c => c.id);
      expect(secondIds).not.toContain(seenId);
    }
  });
});
