import { IntegrationEntity } from '@novu/dal';
import {
  SendgridHandler,
  MailgunHandler,
  EmailJsHandler,
  MailjetHandler,
  MandrillHandler,
  NodemailerHandler,
  PostmarkHandler,
  SendinblueHandler,
  SESHandler,
  NetCoreHandler,
  InfobipEmailHandler,
  MailerSendHandler,
  Outlook365Handler,
  ResendHandler,
  SparkPostHandler,
} from './handlers';
import { IMailHandler } from './interfaces/send.handler.interface';

export class MailFactory {
  handlers: IMailHandler[] = [
    new SendgridHandler(),
    new MailgunHandler(),
    new NetCoreHandler(),
    new EmailJsHandler(),
    new MailjetHandler(),
    new MandrillHandler(),
    new NodemailerHandler(),
    new PostmarkHandler(),
    new SendinblueHandler(),
    new SESHandler(),
    new InfobipEmailHandler(),
    new MailerSendHandler(),
    new Outlook365Handler(),
    new ResendHandler(),
    new SparkPostHandler(),
  ];

  getHandler(
    integration: Pick<
      IntegrationEntity,
      'credentials' | 'channel' | 'providerId'
    >,
    from?: string
  ): IMailHandler {
    try {
      const handler =
        this.handlers.find((handlerItem) =>
          handlerItem.canHandle(integration.providerId, integration.channel)
        ) ?? null;

      if (!handler) throw new Error('Handler for provider was not found');

      handler.buildProvider(integration.credentials, from);

      return handler;
    } catch (error) {
      throw new Error(
        `Could not build mail handler for provider: ${integration.providerId} error ${error}`
      );
    }
  }
}
