import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // Keep LLM packages out of the Turbopack bundle.
  // LangChain model strings (e.g. "openai:gpt-4o") use dynamic import() that Turbopack rejects.
  // Provider packages (e.g. @langchain/openai) are added when you wire an LLM via novu connect.
  serverExternalPackages: [
    'langchain',
    '@langchain/core',
    '@langchain/langgraph',
    '@langchain/langgraph-checkpoint',
  ],
};

export default nextConfig;
