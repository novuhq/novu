import { maskSecretKey } from './wire-env';

export const CHAT_SDK_SKILL_INSTALL_COMMAND = 'npx skills add novuhq/skills --skill novu-chat-sdk -y';

export function buildChatSdkSkillInstructions(input: { agentIdentifier: string; secretKey: string }): string[] {
  return [
    'Your project uses Chat SDK but is missing @novu/chat-sdk-adapter.',
    'Install the Novu Chat SDK skill, then ask your coding agent to wire it:',
    '',
    `  ${CHAT_SDK_SKILL_INSTALL_COMMAND}`,
    '',
    'Then prompt your coding agent:',
    '  "Integrate the Novu Chat SDK adapter into this project using the novu-chat-sdk skill."',
    '',
    `Agent identifier: ${input.agentIdentifier}`,
    `Secret key: ${maskSecretKey(input.secretKey)} (add to .env.local as NOVU_SECRET_KEY)`,
  ];
}
