module.exports = {
  'env': {
    'node': true,
    'es2020': true,
  },
  'extends': [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
    'ecmaFeatures': {
      'jsx': true
    },
    'ecmaVersion': 12,
    'sourceType': 'module',
    'enforceDynamicLinks': 'never'
  },
  'plugins': [
    '@typescript-eslint'
  ],
  'rules': {
    'indent': ['error', 2],
    'linebreak-style': ['error','unix'],
    'quotes': ['error', 'single', {'allowTemplateLiterals': true}],
    'semi': ['error', 'never'],
    'react/prop-types': 0,
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    'react/no-unescaped-entities': [
      'error',
      {
        forbid: ['>', '}'],
      },
    ],
  },
  'globals': {
    'document': true,
    'alert': true,
    'localStorage': true,
    'window': true,
    'DOMParser': true,
    'event': true,
    'XMLHttpRequest': true,
    'FormData': true,
    'JSX': true,
    'fetch': true,
    'jest': true,
    'test': true,
    'describe': true,
    'navigator': true,

    // todo(nc): include all dom api types?
    'Document': true,
    'HTMLElement': true,
    'HTMLInputElement': true
  }
}
