import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TemplateTypeEnum } from './types';

const templateRoot = path.join(__dirname, TemplateTypeEnum.APP_AGENT_LANGCHAIN, 'ts');
const agentFile = path.join(templateRoot, 'app/novu/agents/support-agent.tsx');
const nextConfigFile = path.join(templateRoot, 'next.config.mjs');

describe('app-agent-langchain template', () => {
  it('matches the langchain scaffold contract', () => {
    expect(fs.existsSync(agentFile)).toBe(true);

    const source = fs.readFileSync(agentFile, 'utf8');
    const activeImports = source.split('// Wire your LLM')[0] ?? source;

    expect(source).toContain("from '@novu/framework/langchain'");
    expect(source).not.toMatch(/import\s*\{[^}]*\bagent\b[^}]*\}\s*from\s*'@novu\/framework'/);
    expect(source).not.toContain("from '@novu/framework/ai-sdk'");
    expect(source).toContain("import { tool } from '@langchain/core/tools'");
    expect(source).toContain(
      "import { searchNovuDocsIndex, searchNovuDocsInputSchema } from './tools/search-novu-docs'"
    );
    expect(source).toContain('const searchNovuDocs = tool(');
    expect(source).toContain("toolCall.name === 'searchNovuDocs'");
    expect(source).toContain("model: 'openai:gpt-4o-mini'");
    expect(activeImports).toMatch(/@langchain\/core/);
    expect(activeImports).not.toMatch(/@langchain\/openai/);
  });

  it('ships a Turbopack-safe next.config including common provider packages', () => {
    const nextConfig = fs.readFileSync(nextConfigFile, 'utf8');

    expect(nextConfig).toContain('serverExternalPackages');
    expect(nextConfig).toContain("'langchain'");
    expect(nextConfig).toContain("'@langchain/core'");
    expect(nextConfig).toContain("'@langchain/openai'");
    expect(nextConfig).toContain("'@langchain/anthropic'");
    expect(nextConfig).toContain("'@langchain/google-genai'");
  });
});
