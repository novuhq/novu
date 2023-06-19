const { useBabelRc, override } = require('customize-cra');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

function overrideConfig(config, env) {
  const plugins = [...config.plugins, /* new BundleAnalyzerPlugin() */];
  
  return { ...config, plugins };
}

module.exports = override(useBabelRc(), overrideConfig);
