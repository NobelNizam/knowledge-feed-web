import { logger } from './logger';

function requireSecret(name: string, value: string | undefined): string {
  if (!value && !process.env.JEST_WORKER_ID && process.env.NODE_ENV !== 'test') {
    throw new Error(`${name} is required`);
  }
  return value || `test-${name.toLowerCase()}`;
}

export const JWT_SECRET = requireSecret('JWT_SECRET', process.env.JWT_SECRET);
export const REFRESH_TOKEN_SECRET = requireSecret(
  'REFRESH_TOKEN_SECRET',
  process.env.REFRESH_TOKEN_SECRET
);
// SESSION_SECRET is currently unused by code; kept optional so a missing
// value in legacy env files doesn't fail boot.
export const SESSION_SECRET = process.env.SESSION_SECRET || 'unused-session-secret';

logger.info('[jwtSecrets] initialized');
