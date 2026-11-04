import js from '@eslint/js';

export default [
  {
    ignores: ['node_modules/', 'data/', 'dist/'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^next$', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      'no-async-promise-executor': 'off',
      'no-misleading-character-class': 'error',
      'require-atomic-updates': 'off',
    },
  },
];
