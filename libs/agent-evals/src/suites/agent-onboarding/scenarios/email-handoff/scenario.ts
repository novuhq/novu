import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, connectTape, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));

const inboundAddress = 'connect+agent123@inbound.novu.test';
const mailtoUrl = `mailto:${inboundAddress}?subject=Novu%20Connect`;

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'email-handoff',
  category: 'keyless',
  description: 'Email channel delivers mailto and inbound address handoffs.',
  userPrompt: 'Set up a Novu agent on email for this project.',
  projectRoot: path.join(scenarioDir, 'project'),
  scriptedAnswers: [
    { questionContains: 'channel', optionId: 'email' },
    { questionContains: 'description', optionId: 'approve' },
  ],
  tape: connectTape({
    requireKeyless: true,
    allowedChannels: ['email'],
    chunks: [
      { stdout: `NOVU_CONNECT_INBOUND_ADDRESS=${inboundAddress}` },
      { stdout: `NOVU_CONNECT_MAILTO=${mailtoUrl}` },
      {
        stdout: [
          '✓ Your agent is live.',
          '  Agent: Email Agent (email-agent-1)',
          '  → Check Email — your agent just messaged you.',
          '  Claim your agent: https://dashboard.novu.test/claim/email-token',
        ].join('\n'),
      },
    ],
    exitCode: 0,
  }),
};
