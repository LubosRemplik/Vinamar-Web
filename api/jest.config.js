module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/test/**/*.spec.ts'],
  testPathIgnorePatterns: ['\\.e2e-spec\\.ts$'],
};
