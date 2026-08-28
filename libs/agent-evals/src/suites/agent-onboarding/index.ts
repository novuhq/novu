import { resolvePackageFile } from '../../core/resolve-package-file.js';
import type { Suite } from '../../core/types.js';
import { type ConnectFlags, connectParser } from './connect-parser.js';
import { graders as bridgeExistingAiSdkGraders } from './scenarios/bridge-existing-ai-sdk/graders.js';
import { scenario as bridgeExistingAiSdkScenario } from './scenarios/bridge-existing-ai-sdk/scenario.js';
import { graders as bridgeExistingLangchainGraders } from './scenarios/bridge-existing-langchain/graders.js';
import { scenario as bridgeExistingLangchainScenario } from './scenarios/bridge-existing-langchain/scenario.js';
import { graders as bridgeScaffoldAiSdkGraders } from './scenarios/bridge-scaffold-ai-sdk/graders.js';
import { scenario as bridgeScaffoldAiSdkScenario } from './scenarios/bridge-scaffold-ai-sdk/scenario.js';
import { graders as bridgeScaffoldLangchainGraders } from './scenarios/bridge-scaffold-langchain/graders.js';
import { scenario as bridgeScaffoldLangchainScenario } from './scenarios/bridge-scaffold-langchain/scenario.js';
import { graders as dashboardWebChatGraders } from './scenarios/dashboard-web-chat/graders.js';
import { scenario as dashboardWebChatScenario } from './scenarios/dashboard-web-chat/scenario.js';
import { graders as dashboardPromptLoginGraders } from './scenarios/dashboard-prompt-login/graders.js';
import { scenario as dashboardPromptLoginScenario } from './scenarios/dashboard-prompt-login/scenario.js';
import { graders as disciplineNoTimersGraders } from './scenarios/discipline-no-timers/graders.js';
import { scenario as disciplineNoTimersScenario } from './scenarios/discipline-no-timers/scenario.js';
import { graders as emailHandoffGraders } from './scenarios/email-handoff/graders.js';
import { scenario as emailHandoffScenario } from './scenarios/email-handoff/scenario.js';
import { graders as keylessSendblueGraders } from './scenarios/keyless-sendblue/graders.js';
import { scenario as keylessSendblueScenario } from './scenarios/keyless-sendblue/scenario.js';
import { graders as keylessSlackSecureGraders } from './scenarios/keyless-slack-secure/graders.js';
import { scenario as keylessSlackSecureScenario } from './scenarios/keyless-slack-secure/scenario.js';
import { graders as keylessTeamsRedirectGraders } from './scenarios/keyless-teams-redirect/graders.js';
import { scenario as keylessTeamsRedirectScenario } from './scenarios/keyless-teams-redirect/scenario.js';
import { graders as keylessWhatsappConnectGraders } from './scenarios/keyless-whatsapp-connect/graders.js';
import { scenario as keylessWhatsappConnectScenario } from './scenarios/keyless-whatsapp-connect/scenario.js';
import { graders as personaInfraExclusionGraders } from './scenarios/persona-infra-exclusion/graders.js';
import { scenario as personaInfraExclusionScenario } from './scenarios/persona-infra-exclusion/scenario.js';
import { graders as slackInChatRerunGraders } from './scenarios/slack-in-chat-rerun/graders.js';
import { scenario as slackInChatRerunScenario } from './scenarios/slack-in-chat-rerun/scenario.js';
import { graders as telegramSecureQrGraders } from './scenarios/telegram-secure-qr/graders.js';
import { scenario as telegramSecureQrScenario } from './scenarios/telegram-secure-qr/scenario.js';

export const AGENT_ONBOARDING_DOC_PATH = resolvePackageFile('@novu/shared/docs/agent-onboarding.md');

const SYSTEM_PROMPT_PREAMBLE = [
  'You are an AI coding agent executing the Novu agent onboarding playbook exactly.',
  'Follow the playbook precisely. Use the provided tools.',
  'You are running in a Claude Code-like environment with Bash, BashOutput, AskUserQuestion, Read, and Write tools.',
  'The project fixture files are in the current workspace; read README.md and package.json before drafting the agent description.',
].join('\n');

export const agentOnboardingSuite: Suite<ConnectFlags> = {
  id: 'agent-onboarding',
  description:
    'Behavioral evals for the Novu agent onboarding playbook (managed and custom-code bridge `npx novu connect` flows).',
  systemPrompt: { path: AGENT_ONBOARDING_DOC_PATH },
  systemPromptPreamble: SYSTEM_PROMPT_PREAMBLE,
  commandParser: connectParser,
  sentinelFilePatterns: [/NOVU_CONNECT_AUTH_URL_FILE=(\S+)/],
  followUpTextPattern: /paste.*token|configuration token|xoxe\.xoxp/i,
  onTrackedCommand: (_command, parsed, recorder) => {
    if (parsed.description) {
      recorder.setMetadata('description', parsed.description);
    }
    if (parsed.sendblueFrom) {
      recorder.setMetadata('sendblueFrom', parsed.sendblueFrom);
    }
    if (parsed.sendblueTestPhone) {
      recorder.setMetadata('sendblueTestPhone', parsed.sendblueTestPhone);
    }
  },
  scenarios: [
    { scenario: keylessSlackSecureScenario, graders: keylessSlackSecureGraders },
    { scenario: keylessSendblueScenario, graders: keylessSendblueGraders },
    { scenario: dashboardWebChatScenario, graders: dashboardWebChatGraders },
    { scenario: dashboardPromptLoginScenario, graders: dashboardPromptLoginGraders },
    { scenario: bridgeExistingAiSdkScenario, graders: bridgeExistingAiSdkGraders },
    { scenario: bridgeExistingLangchainScenario, graders: bridgeExistingLangchainGraders },
    { scenario: bridgeScaffoldAiSdkScenario, graders: bridgeScaffoldAiSdkGraders },
    { scenario: bridgeScaffoldLangchainScenario, graders: bridgeScaffoldLangchainGraders },
    { scenario: keylessTeamsRedirectScenario, graders: keylessTeamsRedirectGraders },
    { scenario: keylessWhatsappConnectScenario, graders: keylessWhatsappConnectGraders },
    { scenario: emailHandoffScenario, graders: emailHandoffGraders },
    { scenario: telegramSecureQrScenario, graders: telegramSecureQrGraders },
    { scenario: slackInChatRerunScenario, graders: slackInChatRerunGraders },
    { scenario: personaInfraExclusionScenario, graders: personaInfraExclusionGraders },
    { scenario: disciplineNoTimersScenario, graders: disciplineNoTimersGraders },
  ],
};
