import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TemplateTypeEnum } from './types';

const templateRoot = path.join(__dirname, TemplateTypeEnum.APP_AGENT_AI_SDK, 'ts');
const agentFile = path.join(templateRoot, 'app/novu/agents/support-agent.tsx');

describe('app-agent-ai-sdk template', () => {
  it('matches the ai-sdk scaffold contract', () => {
    expect(fs.existsSync(agentFile)).toBe(true);

    const source = fs.readFileSync(agentFile, 'utf8');
    const activeImports = source.split('// Wire your LLM')[0] ?? source;

    expect(source).toContain("from '@novu/framework/ai-sdk'");
    expect(source).not.toMatch(/import\s*\{[^}]*\bagent\b[^}]*\}\s*from\s*'@novu\/framework'/);
    expect(source).toContain("import { tool } from 'ai'");
    expect(source).toContain(
      "import { searchNovuDocsIndex, searchNovuDocsInputSchema } from './tools/search-novu-docs'"
    );
    expect(source).toContain('needsApproval: true');
    expect(source).toContain('generateText');
    expect(source).toContain('toModelMessages');
    expect(source).not.toMatch(/^\s*return generateText/m);
    expect(activeImports).toMatch(/from 'ai'/);
    expect(activeImports).not.toMatch(/@ai-sdk\//);
    expect(activeImports).not.toMatch(/generateText/);
  });
});
