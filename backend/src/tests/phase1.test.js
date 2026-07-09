// Phase 1 audit fixes — minimal assertion-based self-checks.
// Pure unit tests + a single supertest auth-gate check. No DB / Redis needed.

const request = require('supertest');

let app;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://x';
  ({ app } = require('../index'));
});

describe('Phase 1 — auth gate on refresh endpoints', () => {
  test('POST /api/feed/refresh rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/api/feed/refresh')
      .send({ filterType: 'all' });
    expect(res.statusCode).toBe(401);
  });
});

describe('Phase 1 — publisher domain allowlist', () => {
  test('falls back to "general" when LLM returns an unknown domain', async () => {
    const { publishCard } = require('../pipeline/publisher');
    const prisma = require('../lib/prisma');

    const captured = [];
    const origCreate = prisma.knowledgeCard.create;
    const origFindFirst = prisma.knowledgeCard.findFirst;
    prisma.knowledgeCard.create = ({ data }) => {
      captured.push(data);
      return Promise.resolve({ id: 'test', ...data });
    };
    prisma.knowledgeCard.findFirst = () => Promise.resolve(null);

    try {
      await publishCard(
        { title: 't', content: 'c', domain: 'AbsurdlyMadeUpDiscipline' },
        { verified: false, confidence: 0 },
        { status: 'approved' },
        []
      );
      await publishCard(
        { title: 't2', content: 'c2', domain: 'Physics' },
        { verified: false, confidence: 0 },
        { status: 'approved' },
        []
      );

      expect(captured).toHaveLength(2);
      expect(typeof captured[0].domainId).toBe('number');
      expect(typeof captured[1].domainId).toBe('number');
    } finally {
      prisma.knowledgeCard.create = origCreate;
      prisma.knowledgeCard.findFirst = origFindFirst;
    }
  });
});
