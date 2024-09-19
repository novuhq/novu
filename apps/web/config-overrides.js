const { useBabelRc, override, overrideDevServer } = require('customize-cra');
const { DefinePlugin } = require('webpack');
const { ModuleFederationPlugin } = require('webpack').container;
const { version } = require('./package.json');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

function overrideConfig(config, env) {
  const plugins = [
    ...config.plugins,
    new ModuleFederationPlugin({
      name: 'remote',
      library: { type: 'module' },
      filename: 'remoteEntry.js',
      exposes: {
        './IntegrationsListPage': './src/pages/integrations/IntegrationsListPage',
        './Providers': './src/Providers',
      },
      shared: {
        react: {
          // eager: true,
          // singleton: true,
          requiredVersion: '^18.3.1',
        },
        'react-dom': {
          // eager: true,
          // singleton: true,
          requiredVersion: '^18.3.1',
        },
        'react-router-dom': {
          // eager: true,
          // singleton: true,
          requiredVersion: '6.2.2',
        },
      },
    }),
    new DefinePlugin({
      'process.env.NOVU_VERSION': JSON.stringify(version),
    }),
    /* new BundleAnalyzerPlugin() */
  ];

  return {
    ...config,
    output: {
      ...config.output,
      publicPath: 'auto',
    },
    experiments: {
      outputModule: true,
    },
    optimization: {
      minimize: false,
    },
    plugins,
    ignoreWarnings: [
      {
        message: /Module not found: Error: Can't resolve \'@novu\/ee-.*\' .*/,
      },
    ],
  };
}

const devServerConfig = () => (config) => {
  return {
    ...config,
    headers: (req, res, context) => {
      const defaultHeaders = {
        'Referrer-Policy': 'no-referrer',
        'X-XSS-Protection': '1; mode=block',
        'X-Content-Type-Options': 'nosniff',
        'Permissions-Policy':
          'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()',
      };

      const playgroundHeaders = {
        ...defaultHeaders,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'Referrer-Policy': 'no-referrer-when-downgrade',
      };

      const secureRoutes = ['/auth/application', '/playground'];

      return secureRoutes.includes(req.baseUrl) ? playgroundHeaders : defaultHeaders;
    },
  };
};

module.exports = {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  webpack: override(useBabelRc(), overrideConfig),
  devServer: overrideDevServer(devServerConfig()),
};
