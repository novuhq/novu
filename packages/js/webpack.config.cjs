const path = require('path');
const webpack = require('webpack');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { name, version } = require('./package.json');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const isProd = process.env?.NODE_ENV === 'production';

module.exports = {
  entry: './src/umd.ts',
  mode: 'production',
  devtool: 'hidden-source-map',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    library: 'NotificationCenterWebComponent',
    libraryTarget: 'umd',
    filename: 'novu.min.js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: true,
          sourceMap: false,
        },
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      PACKAGE_NAME: `"${name}"`,
      PACKAGE_VERSION: `"${version}"`,
      __DEV__: `${!isProd}`,
    }),
    new CompressionPlugin({
      test: /\.js(\?.*)?$/i,
      threshold: 10240,
      minRatio: 0.6,
    }),
    // new BundleAnalyzerPlugin(),
  ],
};
