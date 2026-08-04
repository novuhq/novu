import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, connectTape, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'bridge-existing-ai-sdk',
  category: 'bridge',
  description: 'Existing AI SDK app: detect runtime, connect bridge, read requirements, Write route + handler.',
  userPrompt:
    "I'm signed in to the Novu dashboard. Add an agent to my app using the AI SDK bridge and connect it to Slack.",
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
      { stdout: 'NOVU_CONNECT_SLACK_SETUP_URL=https://setup.novu.test/slack/exist-ai' },
      { stdout: 'NOVU_CONNECT_SLACK_CONFIG_TOKEN_SAVED=1' },
      { stdout: 'NOVU_CONNECT_SLACK_AUTHORIZE_URL=https://slack.test/oauth/exist-ai' },
      {
        stdout: `NOVU_CONNECT_AI_SDK_REQUIREMENTS_FILE=${path.join(scenarioDir, 'project/novu-ai-sdk-requirements.txt')}`,
      },
      {
        stdout: [
          '✓ Your agent is live.',
          '  Agent: Acme Agent (acme-agent-1)',
          '  → Check Slack — your agent just messaged you.',
          '  Dashboard: https://dashboard.novu.test/agents/acme-agent-1',
        ].join('\n'),
      },
    ],
    exitCode: 0,
  }),
};
