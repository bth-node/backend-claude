import js from '@eslint/js';
import css from '@eslint/css';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default [
  { ignores: ['solution/', 'solution_/', 'node_modules/'] },

  // JavaScript — src/ and middleware/ (Node.js)
  {
    files: ['src/**/*.js', 'middleware/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.node,
    },
  },
  {
    files: ['src/**/*.js', 'middleware/**/*.js'],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },

  // JavaScript — public/ (browser)
  {
    files: ['public/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'script',
      globals: { ...globals.browser, io: 'readonly' },
    },
  },
  {
    files: ['public/**/*.js'],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },

  // CSS — public/
  {
    files: ['public/**/*.css'],
    plugins: { css },
    language: 'css/css',
    rules: {
      ...css.configs.recommended.rules,
      'css/use-baseline': 'off',  // backdrop-filter is well-supported but not "widely available" per Baseline
      'css/no-important': 'off',  // .hidden uses !important legitimately to override specificity
    },
  },

  prettierConfig,
];
