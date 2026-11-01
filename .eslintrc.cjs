module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: ['react', '@typescript-eslint'],
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    // TypeScript provides compile-time prop checking, so runtime prop-types are redundant.
    'react/prop-types': 'off',
    // This codebase intentionally uses `any` for dynamic Airtable field bags and caught errors.
    '@typescript-eslint/no-explicit-any': 'off',
    // Allow intentionally-unused identifiers when prefixed with an underscore.
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    {
      // Node CommonJS files (server, build scripts) use require() and run on Node.
      files: ['*.js', '*.cjs'],
      parserOptions: { sourceType: 'script' },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ]
};
