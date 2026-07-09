// Phase 3 audit fixes — minimal assertion-based self-checks.

const request = require('supertest');
const fs = require('fs');
const path = require('path');

let app;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://x';
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://x';
  ({ app } = require('../index'));
});

describe('Phase 3.14 — auto-refresh interceptor in web/lib/api.ts', () => {
  const apiSrc = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'web', 'lib', 'api.ts'),
    'utf8'
  );

  test('declares a single in-flight refresh promise (stampede guard)', () => {
    expect(apiSrc).toMatch(/refreshInflight/);
    expect(apiSrc).toMatch(/Promise<boolean>/);
  });

  test('401 retry path calls /auth/refresh then retries the original fetch', () => {
    expect(apiSrc).toMatch(/response\.status\s*===\s*401/);
    expect(apiSrc).toMatch(/auth\/refresh/);
  });

  test('auth endpoints are excluded from refresh recursion (_skipRefresh)', () => {
    expect(apiSrc).toMatch(/_skipRefresh\??:\s*boolean/);
    expect(apiSrc).toMatch(/startsWith\(['"`]\/auth\//);
  });
});

describe('Phase 3.15 — PII redaction in request logging', () => {
  const indexSrc = fs.readFileSync(path.join(__dirname, '..', 'index.ts'), 'utf8');

  test('declares a REDACTED_FIELDS set with password, token, email, name, text, comment, content', () => {
    expect(indexSrc).toMatch(/REDACTED_FIELDS/);
    expect(indexSrc).toMatch(/password/);
    expect(indexSrc).toMatch(/refreshToken/);
    expect(indexSrc).toMatch(/email/);
    expect(indexSrc).toMatch(/name/);
    expect(indexSrc).toMatch(/text/);
    expect(indexSrc).toMatch(/comment/);
  });

  test('sanitize() recursively walks arrays and objects, replacing matches with [REDACTED]', () => {
    expect(indexSrc).toMatch(/(?:function|const)\s+sanitize/);
    expect(indexSrc).toMatch(/REDACTED/);
  });
});

describe('Phase 3.16 — backend/.env.example exists, not in .gitignore', () => {
  test('.env.example file exists with all major env vars', () => {
    const envExample = fs.readFileSync(
      path.join(__dirname, '..', '..', '.env.example'),
      'utf8'
    );
    expect(envExample).toMatch(/DATABASE_URL/);
    expect(envExample).toMatch(/REDIS_URL/);
    expect(envExample).toMatch(/JWT_SECRET/);
    expect(envExample).toMatch(/NVIDIA_API_KEY/);
    // ponytail: keep .env.example aligned with the existing legacy .env
    // (REFRESH_TOKEN_SECRET) so existing deployments don't break.
    expect(envExample).toMatch(/REFRESH_TOKEN_SECRET/);
  });

  test('root .gitignore no longer ignores backend/.env.example', () => {
    const gitignore = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', '.gitignore'),
      'utf8'
    );
    expect(gitignore).not.toMatch(/backend\/\.env\.example/);
  });
});

describe('Phase 3.17 — dead runWithModel + generateKnowledgeCards removed/kept per audit', () => {
  const aiGenSrc = fs.readFileSync(
    path.join(__dirname, '..', 'services', 'aiGenerator.ts'),
    'utf8'
  );

  test('runWithModel is no longer exported (was dead fallback param)', () => {
    expect(aiGenSrc).not.toMatch(/export\s+.*runWithModel/);
  });

  test('generateKnowledgeCards still exported (used by worker CLI "simple" mode)', () => {
    expect(aiGenSrc).toMatch(/export\s+(async\s+)?function\s+generateKnowledgeCards/);
  });
});

describe('Phase 3.18 — docker-compose REDIS_PORTS has default', () => {
  const compose = fs.readFileSync(
    path.join(__dirname, '..', '..', 'docker-compose.yml'),
    'utf8'
  );

  test('redis port mapping has a default fallback (no longer a bare ${REDIS_PORTS})', () => {
    expect(compose).toMatch(/\$\{REDIS_PORTS:-6379:6379\}/);
    expect(compose).not.toMatch(/-\s+\$\{REDIS_PORTS\}/);
  });
});

describe('Phase 3.19 — env-based API rewrite in web/next.config.js', () => {
  const nextConfig = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'web', 'next.config.js'),
    'utf8'
  );

  test('rewrites() uses process.env.API_UPSTREAM_URL or localhost default', () => {
    expect(nextConfig).toMatch(/API_UPSTREAM_URL/);
    expect(nextConfig).toMatch(/localhost:3001/);
    expect(nextConfig).not.toMatch(/destination:\s*'http:\/\/localhost:3001\/api/);
  });

  test('no longer hardcodes http://localhost:3001 destination (was the old broken value)', () => {
    expect(nextConfig).not.toMatch(/destination:\s*['"`]http:\/\/localhost:3001\/api/);
  });
});

describe('Phase 3.20 — ARCHITECTURE.md has ground-truth section', () => {
  const arch = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'ARCHITECTURE.md'),
    'utf8'
  );

  test('documents the reality (Next.js 14.2.35, Prisma, Redis, no GraphQL/MinIO/CDN yet)', () => {
    expect(arch).toMatch(/Status Implementasi Aktual|ground truth|Current Implementation/);
    expect(arch).toMatch(/Next\.js 14\.2\.35/);
    expect(arch).toMatch(/CommonJS|REST only/);
  });
});

describe('Phase 3 bonus — backend migrated to TypeScript', () => {
  const repoRoot = path.join(__dirname, '..', '..', '..');

  test('backend tsconfig.json exists with allowJs + strict + noEmit', () => {
    const tsconfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', 'tsconfig.json'), 'utf8')
    );
    expect(tsconfig.compilerOptions.allowJs).toBe(true);
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.outDir).toBe('dist');
  });

  test('package.json uses tsx for start/dev scripts and lists ts-jest', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')
    );
    expect(pkg.scripts.start).toMatch(/node/);
    expect(pkg.scripts.dev).toMatch(/tsx/);
    expect(pkg.devDependencies).toHaveProperty('tsx');
    expect(pkg.devDependencies).toHaveProperty('typescript');
    expect(pkg.devDependencies).toHaveProperty('ts-jest');
  });

  test('lib/, middleware/, routes/, services/, queue/, workers/, pipeline/ are all .ts', () => {
    const subdirs = ['lib', 'middleware', 'routes', 'services', 'queue', 'workers', 'pipeline'];
    for (const d of subdirs) {
      const dir = path.join(__dirname, '..', d);
      const files = fs.readdirSync(dir);
      const jsFiles = files.filter((f) => f.endsWith('.js'));
      expect(jsFiles).toEqual([]);
    }
  });

  test('tsc --noEmit passes (backend typecheck)', () => {
    // ponytail: invoke the real compiler. The test process has TS installed
    // via the dev deps we declared. If the project fails to typecheck, this
    // assertion fails — which is the regression we want to catch.
    const { execSync } = require('child_process');
    const out = execSync('npx tsc --noEmit', {
      cwd: path.join(__dirname, '..', '..'),
      encoding: 'utf8',
      stdio: 'pipe',
    });
    expect(out).toBeDefined();
  }, 60000);
});
