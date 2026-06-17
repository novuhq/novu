import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CHAT_SDK_PROMPT_FILE_ENV = 'NOVU_CONNECT_CHAT_SDK_PROMPT_FILE';

export function writeChatSdkAgentPromptFile(agentPrompt: string): string {
  const filePath = path.join(os.tmpdir(), `novu-chat-sdk-prompt-${process.pid}.txt`);
  fs.writeFileSync(filePath, agentPrompt, 'utf8');

  return filePath;
}
