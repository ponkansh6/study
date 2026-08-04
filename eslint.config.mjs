import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      react: {
        version: "19.2.7",
      },
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Build and cache directories
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "node_modules/**",
    ".venv/**",
    ".vitest/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",

    // Project assets
    "public/**",
    "scripts/**",
    "tests/**",

    // Config and data files
    "*.json",
    "next-env.d.ts",
    "eslint.config.mjs",
    "vitest.config.ts",
    "playwright.config.ts",
  ]),
]);

export default eslintConfig;
