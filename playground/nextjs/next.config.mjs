/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // LangChain model strings (e.g. "openai:gpt-4o-mini") use dynamic import() that Turbopack rejects.
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
