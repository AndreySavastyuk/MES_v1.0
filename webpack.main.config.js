const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/main/index.ts',
  target: 'electron-main',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true, // Игнорируем проверку типов
            compilerOptions: {
              noEmit: false,
              declaration: false
            }
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  output: {
    path: path.resolve(__dirname, 'dist/main'),
    filename: 'index.js'
  },
  externals: {
    'sqlite3': 'commonjs sqlite3',
    'better-sqlite3': 'commonjs better-sqlite3'
  },
  node: {
    __dirname: false,
    __filename: false
  }
}; 