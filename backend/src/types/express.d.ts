// Global type augmentation for Express.
// Loaded automatically because of `include` in tsconfig.

import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role?: 'USER' | 'ADMIN';
      };
    }
  }
}

export {};
