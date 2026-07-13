import { IntegrationEntity } from '@novu/dal';
import { GithubSignalsHandler } from './handlers/github-signals.handler';
import { SignalsWebhookHandler } from './handlers/signals-webhook.handler';
import { ISignalsFactory, ISignalsHandler } from './interfaces';

export class SignalsFactory implements ISignalsFactory {
  handlers: ISignalsHandler[] = [new GithubSignalsHandler(), new SignalsWebhookHandler()];

  getHandler(integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>) {
    const handler =
      this.handlers.find((handlerItem) => handlerItem.canHandle(integration.providerId, integration.channel)) ?? null;

    if (!handler) return null;

    handler.buildProvider(integration.credentials);

    return handler;
  }
}
