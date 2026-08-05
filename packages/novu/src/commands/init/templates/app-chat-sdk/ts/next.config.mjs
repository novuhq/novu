import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Pin the workspace root to this project directory so Next.js doesn't
    // confuse sibling package-lock.json files in parent directories.
    root: __dirname,
  },
};

export default nextConfig;
