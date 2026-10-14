module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'prettier'],
  rules: {
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    // Every <img> here shows a data: URI, a local blob preview or a signed
    // backend URL — none of which next/image can optimize.
    '@next/next/no-img-element': 'off',
  },
};
