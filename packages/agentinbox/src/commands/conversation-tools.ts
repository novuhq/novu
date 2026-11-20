import { version } from '../../package.json';
import { createApiClient } from '../api/client';
import { loadConfig } from '../config';
import { serveConversationTools } from '../listen/conversation-tools';
import { isListenHostId } from '../listen/hosts';

export interface ConversationToolsCommandOptions {
  conversation: string;
  host?: string;
}

/**
 * `agentinbox conversation-tools --conversation <id>`: the MCP server with a contact's run's own conversation tools,
 * which the listener has the host start for that run. Its output is the MCP connection, so nothing else is written
 * there; it uses the connection saved on this computer, as `listen` does.
 */
export async function conversationToolsCommand(options: ConversationToolsCommandOptions): Promise<never> {
  const config = loadConfig();
  if (!config) {
    process.stderr.write('This computer isn’t connected to Agent Inbox.\n');
    process.exit(1);
  }

  const client = createApiClient({
    apiUrl: config.apiUrl,
    secretKey: config.auth.secretKey,
    keylessIdentifier: config.auth.mode === 'keyless' ? config.auth.keylessIdentifier : undefined,
    ...(options.host && isListenHostId(options.host) ? { asHost: options.host } : {}),
  });

  await serveConversationTools(process.stdin, process.stdout, {
    client,
    conversationId: options.conversation,
    agentIdentifier: config.relayAgentIdentifier,
    version,
  });
  process.exit(0);
}
