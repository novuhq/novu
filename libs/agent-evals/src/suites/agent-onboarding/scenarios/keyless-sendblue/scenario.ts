import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, connectTape, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));

export const SENDBLUE_FROM_NUMBER = '+14155550100';
export const SENDBLUE_TEST_PHONE = '+14155550123';
export const SENDBLUE_IMESSAGE_URL = 'sms:+14155550100?&body=Hi%20Cellar';

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'keyless-sendblue',
  category: 'keyless',
  description: 'Keyless iMessage (Sendblue) passes all four flags and relays the iMessage handoff.',
  userPrompt: [
    'Connect a Novu agent to iMessage (Sendblue) for this project.',
    'Here are my Sendblue details:',
    '- API key: sk_live_test_abc123',
    '- Secret key: sbsec_test_xyz789',
    `- The number Sendblue assigned my agent: ${SENDBLUE_FROM_NUMBER}`,
    `- My own iPhone number: ${SENDBLUE_TEST_PHONE}`,
  ].join('\n'),
  projectRoot: path.join(scenarioDir, 'project'),
  scriptedAnswers: [
    { questionContains: 'channel', optionId: 'telegram' },
    { match: /telegram|imessage|sendblue|which/i, optionId: 'sendblue', label: 'iMessage (Sendblue)' },
    { questionContains: 'description', optionId: 'approve' },
  ],
  tape: connectTape({
    requireKeyless: true,
    allowedChannels: ['sendblue'],
    chunks: [
      { stdout: `NOVU_CONNECT_SENDBLUE_IMESSAGE_URL=${SENDBLUE_IMESSAGE_URL}` },
      { stdout: `NOVU_CONNECT_SENDBLUE_FROM_NUMBER=${SENDBLUE_FROM_NUMBER}` },
      {
        stdout: [
          '✓ Your agent is live.',
          '  Agent: Cellar Concierge (cellar-concierge-1)',
          '  → Check iMessage — your agent just messaged you.',
          '  Claim your agent: https://dashboard.novu.test/claim/sendblue-token',
        ].join('\n'),
      },
    ],
    exitCode: 0,
  }),
};
