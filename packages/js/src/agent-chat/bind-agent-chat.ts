import { AgentChatService, HttpClient, InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import type { BaseSocketInterface } from '../ws/base-socket';
import { AgentChat } from './agent-chat';

export function createBoundAgentChat(deps: {
  inboxService: InboxService;
  emitter: NovuEventEmitter;
  httpClient: HttpClient;
  socket: Pick<BaseSocketInterface, 'connect'>;
}): AgentChat {
  const agentChatService = new AgentChatService({ httpClient: deps.httpClient });

  return new AgentChat({
    inboxServiceInstance: deps.inboxService,
    eventEmitterInstance: deps.emitter,
    agentChatService,
    socket: deps.socket,
  });
}
