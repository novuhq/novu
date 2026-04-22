import chalk from 'chalk';
import { EnvoyCommandOptions, ProjectContext, ResolvedAuth, UserIntent } from '../types';
import { buildSystemPrompt } from './system-prompt';

export interface RunAgentInput {
  options: EnvoyCommandOptions;
  auth: ResolvedAuth;
  project: ProjectContext;
  intent: UserIntent;
}

export interface AgentRunSummary {
  totalMessages: number;
  toolCalls: number;
  errors: number;
}

export async function runAgent(input: RunAgentInput): Promise<AgentRunSummary> {
  const { options, auth, project, intent } = input;

  let query: typeof import('@anthropic-ai/claude-agent-sdk')['query'];
  try {
    ({ query } = await import('@anthropic-ai/claude-agent-sdk'));
  } catch (error) {
    throw new Error(
      'The @anthropic-ai/claude-agent-sdk package is required to run `novu envoy`.\n' +
        'Install it with: npm install -g @anthropic-ai/claude-agent-sdk'
    );
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ANTHROPIC_BASE_URL: `${auth.apiUrl.replace(/\/$/, '')}/v2/llm`,
    ANTHROPIC_AUTH_TOKEN: `ApiKey ${auth.secretKey}`,
    ANTHROPIC_API_KEY: `ApiKey ${auth.secretKey}`,
  };

  const mcpUrl = auth.region === 'eu' ? 'https://mcp.novu.co/?region=eu' : 'https://mcp.novu.co/';

  const summary: AgentRunSummary = { totalMessages: 0, toolCalls: 0, errors: 0 };

  const iterator = query({
    prompt: buildSystemPrompt({ project, intent, auth }),
    options: {
      model: options.model ?? 'claude-sonnet-4-5',
      cwd: process.cwd(),
      settingSources: ['project'],
      permissionMode: options.yes ? 'acceptEdits' : 'default',
      allowedTools: [
        'Read',
        'Write',
        'Edit',
        'Glob',
        'Grep',
        'Bash(npm install:*)',
        'Bash(pnpm add:*)',
        'Bash(pnpm install:*)',
        'Bash(yarn add:*)',
        'Bash(bun add:*)',
        'AskUserQuestion',
      ],
      mcpServers: {
        novu: {
          type: 'http',
          url: mcpUrl,
          headers: { Authorization: `Bearer ${auth.secretKey}` },
        },
      },
      env,
    },
  });

  for await (const message of iterator) {
    summary.totalMessages += 1;
    renderMessage(message, summary);
  }

  return summary;
}

function renderMessage(message: unknown, summary: AgentRunSummary): void {
  if (!message || typeof message !== 'object') return;
  const typed = message as { type?: string; message?: { content?: unknown }; subtype?: string; result?: string };

  if (typed.type === 'assistant' && typed.message?.content) {
    const content = typed.message.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (!block || typeof block !== 'object') continue;
        const part = block as { type?: string; text?: string; name?: string };
        if (part.type === 'text' && typeof part.text === 'string') {
          process.stdout.write(`${part.text}\n`);
        } else if (part.type === 'tool_use' && part.name) {
          summary.toolCalls += 1;
          process.stdout.write(chalk.gray(`[tool] ${part.name}\n`));
        }
      }
    }
  } else if (typed.type === 'result' && typeof typed.result === 'string') {
    process.stdout.write(`\n${chalk.green('✔')} ${typed.result}\n`);
  } else if (typed.type === 'error' || typed.subtype === 'error') {
    summary.errors += 1;
    process.stdout.write(chalk.red(`[error] ${JSON.stringify(message)}\n`));
  }
}
