import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TemplateTypeEnum } from './types';

const templateRoot = path.join(__dirname, TemplateTypeEnum.APP_AGENT_LANGCHAIN, 'ts');
const agentFile = path.join(templateRoot, 'app/novu/agents/support-agent.tsx');

describe('app-agent-langchain template', () => {
  it('matches the langchain scaffold contract', () => {
    expect(fs.existsSync(agentFile)).toBe(true);

    const source = fs.readFileSync(agentFile, 'utf8');
    const activeImports = source.split('// Wire your LLM')[0] ?? source;

    expect(source).toContain("from '@novu/framework/langchain'");
    expect(source).not.toMatch(/import\s*\{[^}]*\bagent\b[^}]*\}\s*from\s*'@novu\/framework'/);
    expect(source).not.toContain("from '@novu/framework/ai-sdk'");
    expect(source).toContain("import { tool } from '@langchain/core/tools'");
    expect(source).toContain('const webSearch = tool(');
    expect(source).toContain("toolCall.name === 'webSearch'");
    expect(activeImports).toMatch(/@langchain\/core/);
    expect(activeImports).not.toMatch(/@langchain\/openai/);
  });
});
