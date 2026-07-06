// ponytail: ts-jest transforms .ts/.tsx on the fly so the test runner
// doesn't need a separate compile step.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/tests/**/*.test.(ts|js)'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { isolatedModules: true }],
  },
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
