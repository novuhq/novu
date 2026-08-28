import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, '../..');
const novuReact = path.join(monorepoRoot, 'packages/react');
const novuJs = path.join(monorepoRoot, 'packages/js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@novu/react', '@novu/js'],
  // Turbopack uses the monorepo root as project root for this workspace app,
  // so playground-local node_modules links are invisible without aliases.
  // Absolute alias targets are treated as relative (`./Users/...`) — use repo-relative paths.
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      '@novu/react': './packages/react',
      '@novu/js': './packages/js',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@novu/react': novuReact,
      '@novu/js': novuJs,
    };

    return config;
  },
};

export default nextConfig;
