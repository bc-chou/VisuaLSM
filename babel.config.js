module.exports = {
  presets: [
    "@babel/preset-env",
    ["@babel/preset-react", { "runtime": "automatic" }],
    ["@babel/preset-typescript", { 
      "isTSX": true,
      "allExtensions": true,
      "allowDeclareFields": true
    }]
  ],
  plugins: [
    "@babel/plugin-transform-runtime"
  ]
};