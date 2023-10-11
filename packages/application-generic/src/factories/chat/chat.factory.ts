import { IChatFactory, IChatHandler } from './interfaces';
import { SlackHandler } from './handlers/slack.handler';
import { IntegrationEntity } from '@novu/dal';
import { DiscordHandler } from './handlers/discord.handler';
import { MSTeamsHandler } from './handlers/msteams.handler';
import { MattermostHandler } from './handlers/mattermost.handler';
import { GuildedHandler } from './handlers/guilded.handler';

export class ChatFactory implements IChatFactory {
  handlers: IChatHandler[] = [
    new SlackHandler(),
    new DiscordHandler(),
    new MSTeamsHandler(),
    new MattermostHandler(),
    new GuildedHandler(),
  ];

  getHandler(integration: IntegrationEntity) {
    const handler =
      this.handlers.find((handlerItem) =>
        handlerItem.canHandle(integration.providerId, integration.channel)
      ) ?? null;

    if (!handler) return null;

    handler.buildProvider(integration.credentials);

    return handler;
  }
}
