import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, connectTape, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'dashboard-prompt-login',
  category: 'authenticated',
  description: 'Dashboard prompt must use dashboard OAuth (omit --keyless) and deliver auth URL from file.',
  userPrompt:
    "I'm signed in to the Novu dashboard. Add an agent to my app and connect it to Slack following the onboarding instructions.",
  projectRoot: path.join(scenarioDir, 'project'),
  scriptedAnswers: [
    { questionContains: 'channel', optionId: 'slack' },
    { questionContains: 'description', optionId: 'approve' },
    { questionContains: 'token', optionId: 'secure' },
  ],
  tape: connectTape({
    requireNoKeyless: true,
    allowedChannels: ['slack'],
    chunks: [
      {
        stdout: `NOVU_CONNECT_AUTH_URL_FILE=${path.join(scenarioDir, 'project/novu-connect-auth-url.txt')}`,
      },
      { stdout: 'NOVU_CONNECT_SLACK_SETUP_URL=https://setup.novu.test/slack/login-1' },
      { stdout: 'NOVU_CONNECT_SLACK_CONFIG_TOKEN_SAVED=1' },
      { stdout: 'NOVU_CONNECT_SLACK_AUTHORIZE_URL=https://slack.test/oauth/login-1' },
      {
        stdout: [
          '✓ Your agent is live.',
          '  Agent: Dashboard Agent (dash-agent-1)',
          '  → Check Slack — your agent just messaged you.',
          '  Dashboard: https://dashboard.novu.test/agents/dash-agent-1',
        ].join('\n'),
      },
    ],
    exitCode: 0,
  }),
};
