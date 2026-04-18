import { defineConfig } from 'eslint/config';
import {
  generateJSESLintConfigurations,
  generateTSESLintConfigurations,
} from '@kynsonszetau/lint';

import { join } from 'node:path';

const tsRuleOverrides = {
  '@typescript-eslint/restrict-template-expressions': [
    'error',
    { allowNumber: true, allowBoolean: true },
  ],
};

/**
 * @param {string} subPath sub path to generate configurations for
 */
function generateTSConfigurations(subPath) {
  return generateTSESLintConfigurations(
    [`src/${subPath}/**/*.ts`],
    join(import.meta.dirname, subPath),
    tsRuleOverrides,
  );
}

export default defineConfig(
  ...generateJSESLintConfigurations(['eslint.config.js', '.prettierrc.mjs']),
  ...generateTSESLintConfigurations(['vite.config.ts'], import.meta.dirname),
  ...generateTSConfigurations('engine'),
  ...generateTSConfigurations('frontend'),
  ...generateTSConfigurations('server'),
);
