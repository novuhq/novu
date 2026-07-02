import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ConnectFlags, type EvalScenario } from '../../kit.js';

const scenarioDir = path.dirname(fileURLToPath(import.meta.url));

export const scenario: EvalScenario<ConnectFlags> = {
  id: 'keyless-whatsapp-redirect',
  category: 'keyless',
  description: 'Keyless WhatsApp/Teams must redirect to dashboard without running connect.',
  userPrompt: 'Connect a Novu agent to WhatsApp for this project.',
  projectRoot: path.join(scenarioDir, 'project'),
  scriptedAnswers: [{ questionContains: 'channel', optionId: 'dashboard' }],
};
