import { maskSecretKey } from './wire-env';

export const CHAT_SDK_SKILL_INSTALL_COMMAND = 'npx skills add novuhq/skills --skill novu-chat-sdk -y';

export function buildChatSdkSkillInstructions(input: { agentIdentifier: string; secretKey: string }): string[] {
  return [
    'Chat SDK scaffolding was skipped (--no-scaffold).',
    'Install the Novu Chat SDK integration skill, then ask your coding agent to wire the bridge:',
    '',
    `  ${CHAT_SDK_SKILL_INSTALL_COMMAND}`,
    '',
    'Then prompt your agent:',
    '  "Integrate the Novu Chat SDK adapter into this project using the novu-chat-sdk skill."',
    '',
    `Agent identifier: ${input.agentIdentifier}`,
    `Secret key: ${maskSecretKey(input.secretKey)} (already in your Novu account — add to .env.local when wiring)`,
  ];
}
