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
  MailerSendHandler,
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
    new MailerSendHandler(),
  ];

  getHandler(integration: IntegrationEntity, from?: string): IMailHandler {
    try {
      const handler =
        this.handlers.find((handlerItem) =>
          handlerItem.canHandle(integration.providerId, integration.channel)
        ) ?? null;

      if (!handler) return null;

      handler.buildProvider(integration.credentials, from);

      return handler;
    } catch (error) {
      throw new Error(
        `Could not build mail handler id: ${integration._id} error ${error}`
      );
    }
  }
}
