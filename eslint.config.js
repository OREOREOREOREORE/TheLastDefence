import { defineConfig } from 'eslint/config';
import {
  generateJSESLintConfigurations,
  generateTSESLintConfigurations,
} from '@kynsonszetau/lint';

import { join } from 'node:path';

/**
 * @param {string} subPath sub path to generate configurations for
 */
function generateTSConfigurations(subPath) {
  return generateTSESLintConfigurations(
    [`src/${subPath}/**/*.ts`],
    join(import.meta.dirname, subPath),
  );
}

export default defineConfig(
  ...generateJSESLintConfigurations(['eslint.config.js', '.prettierrc.mjs']),
  ...generateTSESLintConfigurations(['vite.config.ts'], import.meta.dirname),
  ...generateTSConfigurations('engine'),
  ...generateTSConfigurations('frontend'),
  ...generateTSConfigurations('server'),
);
