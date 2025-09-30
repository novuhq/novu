import { IntegrationEntity } from '@novu/dal';
import {
  BrazeEmailHandler,
  EmailJsHandler,
  EmailWebhookHandler,
  InfobipEmailHandler,
  MailerSendHandler,
  MailgunHandler,
  MailjetHandler,
  MailtrapHandler,
  MandrillHandler,
  NetCoreHandler,
  NodemailerHandler,
  NovuEmailHandler,
  Outlook365Handler,
  PlunkHandler,
  PostmarkHandler,
  ResendHandler,
  SESHandler,
  SendgridHandler,
  SendinblueHandler,
  SparkPostHandler,
} from './handlers';
import { IMailFactory, IMailHandler } from './interfaces';

export class MailFactory implements IMailFactory {
  handlers: IMailHandler[] = [
    new SendgridHandler(),
    new MailgunHandler(),
    new NetCoreHandler(),
    new EmailJsHandler(),
    new MailjetHandler(),
    new MailtrapHandler(),
    new MandrillHandler(),
    new NodemailerHandler(),
    new PostmarkHandler(),
    new SendinblueHandler(),
    new SESHandler(),
    new InfobipEmailHandler(),
    new MailerSendHandler(),
    new Outlook365Handler(),
    new ResendHandler(),
    new PlunkHandler(),
    new SparkPostHandler(),
    new EmailWebhookHandler(),
    new NovuEmailHandler(),
    new BrazeEmailHandler(),
  ];

  getHandler(
    integration: Pick<IntegrationEntity, 'credentials' | 'channel' | 'providerId' | 'configurations'>,
    from?: string
  ): IMailHandler {
    const handler =
      this.handlers.find((handlerItem) => handlerItem.canHandle(integration.providerId, integration.channel)) ?? null;

    if (!handler) throw new Error('Handler for provider was not found');

    handler.buildProvider({ ...integration.credentials, ...integration.configurations }, from);

    return handler;
  }
}
