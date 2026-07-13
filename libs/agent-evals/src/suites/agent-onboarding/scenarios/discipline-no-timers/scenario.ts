import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, connectTape, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'discipline-no-timers',
  category: 'discipline',
  description: 'Agent must poll BashOutput repeatedly without sleep/tail/grep watchers.',
  userPrompt: 'Connect a Novu agent to Slack for this project.',
  projectRoot: path.join(scenarioDir, 'project'),
  scriptedAnswers: [
    { questionContains: 'channel', optionId: 'slack' },
    { questionContains: 'description', optionId: 'approve' },
    { questionContains: 'token', optionId: 'secure' },
  ],
  tape: connectTape({
    allowedChannels: ['slack'],
    chunks: [
      { stdout: 'NOVU_CONNECT_SLACK_SETUP_URL=https://setup.novu.test/slack/discipline-1' },
      { stdout: 'Waiting for Slack App Configuration Token...' },
      { stdout: 'Still waiting for Slack App Configuration Token...' },
      { stdout: 'NOVU_CONNECT_SLACK_CONFIG_TOKEN_SAVED=1' },
      { stdout: 'NOVU_CONNECT_SLACK_AUTHORIZE_URL=https://slack.test/oauth/discipline-1' },
      { stdout: 'Waiting for Slack OAuth...' },
      {
        stdout: [
          '✓ Your agent is live.',
          '  Agent: Discipline Agent (discipline-agent-1)',
          '  Claim your agent: https://dashboard.novu.test/claim/discipline-token',
        ].join('\n'),
      },
    ],
    exitCode: 0,
  }),
};
