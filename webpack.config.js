const path = require('path'),
  webpackNodeExternals = require('webpack-node-externals'),
  Obfuscator = require('webpack-obfuscator')

module.exports = {
  target: 'electron-main', // 指定为 Electron 主进程
  entry: {
    main: './main.js', // 主进程入口
    web_api: './web_api.js', // web_api 入口,
    update: './update.js'
  },
  plugins: [
    new Obfuscator({
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      debugProtection: false,
      debugProtectionInterval: 0,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'mangled-shuffled',
      log: false,
      numbersToExpressions: false,
      renameGlobals: false,
      selfDefending: false,
      simplify: true,
      splitStrings: true,
      stringArray: true,
      stringArrayCallsTransform: true,
      stringArrayCallsTransformThreshold: 0.5,
      stringArrayEncoding: ['base64'],
      stringArrayIndexShift: false,
      stringArrayRotate: false,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 1,
      stringArrayWrappersChainedCalls: false,
      stringArrayWrappersParametersMaxCount: 2,
      stringArrayWrappersType: 'variable',
      stringArrayThreshold: 0.75,
      unicodeEscapeSequence: false
    }),
  ],
  output: {
    path: path.resolve(__dirname, 'webpacked'), // 输出的基础目录
    filename: '[name].js', // [name] 表示 entry 的 key
  },
  externals: [webpackNodeExternals()], // 不打包 node_modules
  node: {
    __dirname: false,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.json'],
  },
  stats: {
    colors: true,
    modules: true,
    reasons: true,
    errorDetails: true,
  },
};
