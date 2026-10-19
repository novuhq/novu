import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, connectTape, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'persona-infra-exclusion',
  category: 'inference',
  description: 'Agent description must exclude infra tokens and name the end-user audience.',
  userPrompt: 'Connect a Novu agent to Slack for this project.',
  projectRoot: path.join(scenarioDir, 'project'),
  scriptedAnswers: [
    { questionContains: 'channel', optionId: 'slack' },
    { questionContains: 'description', optionId: 'approve' },
    { questionContains: 'token', optionId: 'secure' },
  ],
  tape: connectTape({
    requireKeyless: true,
    allowedChannels: ['slack'],
    chunks: [
      { stdout: 'NOVU_CONNECT_SLACK_SETUP_URL=https://setup.novu.test/slack/persona-1' },
      { stdout: 'NOVU_CONNECT_SLACK_CONFIG_TOKEN_SAVED=1' },
      { stdout: 'NOVU_CONNECT_SLACK_AUTHORIZE_URL=https://slack.test/oauth/persona-1' },
      {
        stdout: [
          '✓ Your agent is live.',
          '  Agent: Persona Agent (persona-agent-1)',
          '  Claim your agent: https://dashboard.novu.test/claim/persona-token',
        ].join('\n'),
      },
    ],
    exitCode: 0,
  }),
};
