import { IntegrationEntity } from '@novu/dal';
import { ChatWebhookHandler } from './handlers/chat-webhook.handler';
import { DiscordHandler } from './handlers/discord.handler';
import { GetstreamChatHandler } from './handlers/getstream.handler';
import { GrafanaOnCallHandler } from './handlers/grafana-on-call.handler';
import { MattermostHandler } from './handlers/mattermost.handler';
import { MSTeamsHandler } from './handlers/msteams.handler';
import { NovuSlackHandler } from './handlers/novu-slack.handler';
import { RocketChatHandler } from './handlers/rocket-chat.handler';
import { RyverHandler } from './handlers/ryver.handler';
import { SlackHandler } from './handlers/slack.handler';
import { WhatsAppBusinessHandler } from './handlers/whatsapp-business.handler';
import { ZulipHandler } from './handlers/zulip.handler';
import { IChatFactory, IChatHandler } from './interfaces';

export class ChatFactory implements IChatFactory {
  handlers: IChatHandler[] = [
    new ChatWebhookHandler(),
    new SlackHandler(),
    new NovuSlackHandler(),
    new DiscordHandler(),
    new MSTeamsHandler(),
    new MattermostHandler(),
    new RyverHandler(),
    new ZulipHandler(),
    new GrafanaOnCallHandler(),
    new GetstreamChatHandler(),
    new RocketChatHandler(),
    new WhatsAppBusinessHandler(),
  ];

  getHandler(integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>) {
    const handler =
      this.handlers.find((handlerItem) => handlerItem.canHandle(integration.providerId, integration.channel)) ?? null;

    if (!handler) return null;

    handler.buildProvider(integration.credentials);

    return handler;
  }
}
