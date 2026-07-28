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
  // Common providers are listed so wiring an LLM later (npm install + model string) works
  // without editing this file. Unused packages here are harmless.
  serverExternalPackages: [
    'langchain',
    '@langchain/core',
    '@langchain/langgraph',
    '@langchain/langgraph-checkpoint',
    '@langchain/openai',
    '@langchain/anthropic',
    '@langchain/google-genai',
  ],
};

export default nextConfig;
