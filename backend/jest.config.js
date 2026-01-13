const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  globals: {
    'ts-jest': {
      isolatedModules: true,
      diagnostics: {
        ignoreCodes: [151002],
      },
    },
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/services/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/services/business-ledger.service.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'src/services/business-permissions.service.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
