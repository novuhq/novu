import { IntegrationEntity } from '@novu/dal';
import { GrafanaHandler } from './handlers/grafana.handler';
import { OpsgenieHandler } from './handlers/opsgenie.handler';
import { PagerDutyHandler } from './handlers/pagerduty.handler';
import { ToolWebhookHandler } from './handlers/tool-webhook.handler';
import { IToolFactory, IToolHandler } from './interfaces';

export class ToolFactory implements IToolFactory {
  handlers: IToolHandler[] = [
    new PagerDutyHandler(),
    new OpsgenieHandler(),
    new GrafanaHandler(),
    new ToolWebhookHandler(),
  ];

  getHandler(integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>) {
    const handler =
      this.handlers.find((handlerItem) => handlerItem.canHandle(integration.providerId, integration.channel)) ?? null;

    if (!handler) return null;

    handler.buildProvider(integration.credentials);

    return handler;
  }
}
