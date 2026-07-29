import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, connectTape, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'bridge-scaffold-ai-sdk',
  category: 'bridge',
  description: 'Empty dir AI SDK scaffold: --runtime ai-sdk, --llm-auth openai, read requirements (already wired).',
  userPrompt:
    "I'm signed in to the Novu dashboard. This directory is empty — scaffold a new Novu AI SDK agent app, wire OpenAI with API key sk-test-eval, and connect Slack.",
  projectRoot: path.join(scenarioDir, 'project'),
  scriptedAnswers: [
    { questionContains: 'channel', optionId: 'slack' },
    { questionContains: 'token', optionId: 'secure' },
  ],
  tape: connectTape({
    requireNoKeyless: true,
    allowedChannels: ['slack'],
    chunks: [
      {
        stdout: `NOVU_CONNECT_AUTH_URL_FILE=${path.join(scenarioDir, 'project/novu-connect-auth-url.txt')}`,
      },
      { stdout: 'NOVU_CONNECT_SLACK_SETUP_URL=https://setup.novu.test/slack/scaf-ai' },
      { stdout: 'NOVU_CONNECT_SLACK_CONFIG_TOKEN_SAVED=1' },
      { stdout: 'NOVU_CONNECT_SLACK_AUTHORIZE_URL=https://slack.test/oauth/scaf-ai' },
      {
        stdout: `NOVU_CONNECT_AI_SDK_REQUIREMENTS_FILE=${path.join(scenarioDir, 'project/novu-ai-sdk-requirements.txt')}`,
      },
      {
        stdout: [
          '✓ Scaffolded AI SDK agent project',
          '✓ Your agent is live.',
          '  Agent: Scaffold AI (scaffold-ai-1)',
          '  → Check Slack — your agent just messaged you.',
          '  Dashboard: https://dashboard.novu.test/agents/scaffold-ai-1',
        ].join('\n'),
      },
    ],
    exitCode: 0,
  }),
};
