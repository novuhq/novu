import { sentryVitePlugin } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from 'tailwindcss';
import { defineConfig, loadEnv, Plugin } from 'vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  const isSelfHosted = env.VITE_SELF_HOSTED === 'true';

  // Plugin to exclude cloud-specific files in self-hosted builds
  const excludeCloudFilesPlugin = (): Plugin => ({
    name: 'exclude-cloud-files',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!isSelfHosted) return null;
      
      // Redirect cloud region context imports to self-hosted version
      if (source === './region-context' || source === './region-context.tsx') {
        if (importer && importer.includes('context/region/index')) {
          return this.resolve('./region-context.self-hosted.tsx', importer, { skipSelf: true });
        }
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
        targets: [
          {
            src: path.resolve(__dirname, './legacy') + '/[!.]*',
            dest: './legacy',
          },
        ],
      }),
      // Put the Sentry vite plugin after all other plugins
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
    ],
    css: {
      postcss: {
        plugins: [tailwindcss()],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        ...(isSelfHosted
          ? {
              '@clerk/clerk-react': path.resolve(__dirname, './src/utils/self-hosted/index.tsx'),
              '@/context/region': path.resolve(__dirname, './src/context/region/index.self-hosted.ts'),
            }
          : {}),
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
