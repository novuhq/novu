import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, connectTape, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'bridge-scaffold-langchain',
  category: 'bridge',
  description: 'Empty dir LangChain scaffold: --runtime langchain, no --llm-auth (demo echo), read requirements.',
  userPrompt:
    "I'm signed in to the Novu dashboard. This directory is empty — scaffold a new Novu LangChain agent app (demo echo is fine) and connect Slack.",
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
      { stdout: 'NOVU_CONNECT_SLACK_SETUP_URL=https://setup.novu.test/slack/scaf-lc' },
      { stdout: 'NOVU_CONNECT_SLACK_CONFIG_TOKEN_SAVED=1' },
      { stdout: 'NOVU_CONNECT_SLACK_AUTHORIZE_URL=https://slack.test/oauth/scaf-lc' },
      {
        stdout: `NOVU_CONNECT_LANGCHAIN_REQUIREMENTS_FILE=${path.join(scenarioDir, 'project/novu-langchain-requirements.txt')}`,
      },
      {
        stdout: [
          '✓ Scaffolded LangChain agent project',
          '✓ Your agent is live.',
          '  Agent: Scaffold LC (scaffold-lc-1)',
          '  → Check Slack — your agent just messaged you.',
          '  Dashboard: https://dashboard.novu.test/agents/scaffold-lc-1',
        ].join('\n'),
      },
    ],
    exitCode: 0,
  }),
};
