const path = require('path');
const webpack = require('webpack');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

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
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist/umd'),
    clean: true,
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
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    new CompressionPlugin({
      test: /\.js(\?.*)?$/i,
      threshold: 10240,
      minRatio: 0.6,
    }),
    // new BundleAnalyzerPlugin(),
  ],
};
