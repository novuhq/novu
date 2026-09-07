import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDefaultTape, type ConnectFlags, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'keyless-slack-secure',
  category: 'keyless',
  description: 'Keyless Slack secure setup path with background shell polling.',
  userPrompt: 'Help me connect a Novu managed agent to Slack for this project.',
  projectRoot: path.join(scenarioDir, 'project'),
  scriptedAnswers: [
    { questionContains: 'channel', optionId: 'slack' },
    { questionContains: 'description', optionId: 'approve' },
    { questionContains: 'token', optionId: 'secure' },
  ],
  tape: buildDefaultTape({
    allowedChannels: ['slack'],
  }),
};
