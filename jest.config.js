module.exports = {
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '@docusaurus/(.*)': '<rootDir>/node_modules/@docusaurus/$1',
    '@theme/(.*)': '<rootDir>/node_modules/@docusaurus/theme-classic/lib/theme/$1',
    '@site/(.*)': '<rootDir>/$1',
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  testEnvironment: 'jsdom',
};
