import { IntegrationEntity } from '@novu/dal';
import { EmailProviderIdEnum } from 'libs/shared/dist/cjs';
import {
  SendgridHandler,
  MailgunHandler,
  EmailJsHandler,
  MailjetHandler,
  MandrillHandler,
  NodemailerHandler,
  PostmarkHandler,
  BrevoHandler,
  SESHandler,
  NetCoreHandler,
  InfobipEmailHandler,
  MailerSendHandler,
  Outlook365Handler,
  ResendHandler,
  SparkPostHandler,
  EmailWebhookHandler,
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
    new BrevoHandler(EmailProviderIdEnum.Brevo),
    new SESHandler(),
    new InfobipEmailHandler(),
    new MailerSendHandler(),
    new Outlook365Handler(),
    new ResendHandler(),
    new SparkPostHandler(),
    new EmailWebhookHandler(),
  ];

  getHandler(
    integration: Pick<
      IntegrationEntity,
      'credentials' | 'channel' | 'providerId'
    >,
    from?: string
  ): IMailHandler {
    const handler =
      this.handlers.find((handlerItem) => {
        if (integration.providerId === EmailProviderIdEnum.Sendinblue) {
          return new BrevoHandler(integration.providerId).canHandle(
            integration.providerId,
            integration.channel
          );
        }

        handlerItem.canHandle(integration.providerId, integration.channel);
      }) ?? null;

    if (!handler) throw new Error('Handler for provider was not found');

    handler.buildProvider(integration.credentials, from);

    return handler;
  }
}
