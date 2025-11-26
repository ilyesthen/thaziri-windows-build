
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/main/index.ts',
  target: 'electron-main',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        }
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'prisma', to: 'prisma' },
        { from: 'node_modules/.prisma', to: 'node_modules/.prisma' }
      ]
    })
  ],
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
    alias: {
      '@prisma/client': path.resolve(__dirname, 'node_modules/@prisma/client')
    }
  },
  externals: {
    '@prisma/client': 'commonjs @prisma/client',
    'sqlite3': 'commonjs sqlite3',
    'bcryptjs': 'commonjs bcryptjs'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js'
  }
};
