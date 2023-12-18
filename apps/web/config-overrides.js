const { useBabelRc, override } = require('customize-cra');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

function overrideConfig(config, env) {
  const plugins = [...config.plugins /* new BundleAnalyzerPlugin() */];

  return {
    ...config,
    plugins,
    externals: {
      '@novu/ee-translation-web': "require('@novu/ee-translation-web')",
    },
  };
}

module.exports = override(useBabelRc(), overrideConfig);
