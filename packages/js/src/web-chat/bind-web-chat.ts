import { WebChatService, HttpClient, InboxService } from '../api';
import type { NovuEventEmitter } from '../event-emitter';
import type { BaseSocketInterface } from '../ws/base-socket';
import { WebChat } from './web-chat';

export function createBoundWebChat(deps: {
  inboxService: InboxService;
  emitter: NovuEventEmitter;
  httpClient: HttpClient;
  socket: Pick<BaseSocketInterface, 'connect'>;
}): WebChat {
  const webChatService = new WebChatService({ httpClient: deps.httpClient });

  return new WebChat({
    inboxServiceInstance: deps.inboxService,
    eventEmitterInstance: deps.emitter,
    webChatService,
    socket: deps.socket,
  });
}
