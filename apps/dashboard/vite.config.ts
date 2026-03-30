import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  const isSelfHosted = env.VITE_SELF_HOSTED === 'true';
  const eeAuthProvider = env.VITE_EE_AUTH_PROVIDER || 'clerk';
  const isEnterprise = env.VITE_NOVU_ENTERPRISE === 'true';
  const isCommunitySelHosted = isSelfHosted && !isEnterprise;

  // Plugin to redirect direct region-context imports to self-hosted version
  // This ensures we use the simpler self-hosted version instead of bundling Clerk-dependent cloud code
  const excludeCloudFilesPlugin = (): Plugin => ({
    name: 'exclude-cloud-files',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!isSelfHosted && eeAuthProvider !== 'better-auth') return null;
      if (!isCommunitySelHosted) return null;

      // Redirect direct imports of region-context.tsx to the self-hosted version
      // The alias handles @/context/region imports, but direct relative imports need this plugin
      if (
        importer &&
        (source === './region-context' ||
          source === './region-context.tsx' ||
          source.endsWith('/region-context') ||
          source.endsWith('/region-context.tsx'))
      ) {
        // Don't redirect if already importing the self-hosted version
        if (source.includes('region-context.self-hosted')) {
          return null;
        }

        const selfHostedPath = source.replace(/region-context(\.tsx)?$/, 'region-context.self-hosted.tsx');
        return this.resolve(selfHostedPath, importer, { skipSelf: true });
      }
      return null;
    },
  });

  return {
    plugins: [
      excludeCloudFilesPlugin(),
      ViteEjsPlugin((viteConfig) => ({
        // viteConfig is the current Vite resolved config
        env: viteConfig.env,
      })),
      react(),
      viteStaticCopy({
        silent: true,
        targets: [
          {
            src: path.resolve(__dirname, './legacy') + '/[!.]*',
            dest: './legacy',
          },
        ],
      }),
      // Put the Sentry vite plugin after all other plugins
      // Only enable Sentry plugin if auth token is provided
      ...(env.SENTRY_AUTH_TOKEN
        ? [
            sentryVitePlugin({
              org: env.SENTRY_ORG,
              project: env.SENTRY_PROJECT,
              // Auth tokens can be obtained from https://sentry.io/orgredirect/organizations/:orgslug/settings/auth-tokens/
              authToken: env.SENTRY_AUTH_TOKEN,
              reactComponentAnnotation: { enabled: true },
              sourcemaps: {
                assets: './dist/**',
                filesToDeleteAfterUpload: ['**/*.js.map'],
              },
              telemetry: false,
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        ...(isCommunitySelHosted
          ? {
              '@clerk/clerk-react': path.resolve(__dirname, './src/utils/self-hosted/index.tsx'),
              '@/components/side-navigation/organization-dropdown-clerk': path.resolve(
                __dirname,
                './src/utils/self-hosted/organization-switcher.tsx'
              ),
            }
          : eeAuthProvider === 'better-auth'
            ? {
                '@clerk/clerk-react': path.resolve(__dirname, './src/utils/better-auth/index.tsx'),
                '@/context/region': path.resolve(__dirname, './src/context/region/index.self-hosted.ts'),
                '@/components/side-navigation/organization-dropdown-clerk': path.resolve(
                  __dirname,
                  './src/utils/better-auth/components/organization-dropdown.tsx'
                ),
                '@/components/auth/create-organization': path.resolve(
                  __dirname,
                  './src/utils/better-auth/components/organization-create.tsx'
                ),
              }
            : {}),
        '@': path.resolve(__dirname, './src'),
        // Explicitly map prettier imports to browser-compatible versions
        'prettier/standalone': path.resolve(__dirname, './node_modules/prettier/standalone.js'),
        'prettier/plugins/html': path.resolve(__dirname, './node_modules/prettier/plugins/html.js'),
        prettier: path.resolve(__dirname, './node_modules/prettier/standalone.js'),
      },
    },
    server: {
      port: 4201,
      headers: {
        'Document-Policy': 'js-profiling',
      },
    },
    optimizeDeps: {
      include: ['@novu/api'],
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 12000,
      commonjsOptions: {
        include: [/@novu\/api/, /node_modules/],
      },
    },
  };
});
