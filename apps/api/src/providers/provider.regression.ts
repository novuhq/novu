import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { MailtrapInboxStatusEnum, MailtrapService, UserSession } from '@novu/testing';
import { expect } from 'chai';

import { checkProviderIntegration, createProviderIntegration, createRegressionNotificationTemplate } from './helpers';
import { getMailtrapSecrets, getProviderSecrets } from './secrets';

const providers = [EmailProviderIdEnum.SendGrid];

let mailtrapService: MailtrapService;
let session: UserSession;

describe('Regression test - Providers', () => {
  before(async () => {
    session = new UserSession();
    await session.initialize();

    const { accountId, apiKey, inboxId } = getMailtrapSecrets();
    mailtrapService = new MailtrapService(apiKey);
    await mailtrapService.cleanInbox(accountId, inboxId);
  });

  describe('Mailtrap E2E testing', () => {
    const subject = 'Mailtrap regression testing';
    const text = 'Mailtrap regression text';
    const emailPayload = {
      from: {
        email: 'no-reply@novu.co',
        name: 'No-Reply',
      },
      to: [
        {
          email: 'e2e-tests@novu.co',
          name: 'Regression',
        },
      ],
      subject,
      text,
    };

    it('should be able to find the inbox', async () => {
      const { accountId, inboxId } = getMailtrapSecrets();
      const inboxes = await mailtrapService.getInboxes(accountId);

      expect(inboxes.length).to.eql(1);

      const [inbox] = inboxes;
      expect(inbox).to.deep.include({
        id: inboxId,
        name: 'Regression',
        status: MailtrapInboxStatusEnum.ACTIVE,
        used: true,
        domain: 'sandbox.smtp.mailtrap.io',
        email_domain: 'inbox.mailtrap.io',
        emails_count: 0,
        emails_unread_count: 0,
      });
    });

    it('should be able to send an email', async () => {
      const { accountId, inboxId } = getMailtrapSecrets();

      const sendEmailResponse = await mailtrapService.sendEmail(inboxId, emailPayload);

      expect(sendEmailResponse.success).to.eql(true);
      expect(sendEmailResponse.message_ids.length).to.eql(1);
      expect(sendEmailResponse.message_ids[0]).to.be.a('string');

      const inboxes = await mailtrapService.getInboxes(accountId);

      expect(inboxes.length).to.eql(1);

      const [inbox] = inboxes;
      expect(inbox).to.deep.include({
        id: inboxId,
        name: 'Regression',
        emails_count: 1,
        emails_unread_count: 1,
      });
    });

    it('should be able to get inbox messages', async () => {
      const { accountId, inboxId } = getMailtrapSecrets();
      const messages = await mailtrapService.getInboxMessages(accountId, inboxId);

      expect(messages.length).to.eql(1);
      const [message] = messages;

      expect(message).to.deep.include({
        inbox_id: inboxId,
        subject,
        from_email: emailPayload.from.email,
        from_name: emailPayload.from.name,
        to_email: emailPayload.to[0].email,
        to_name: emailPayload.to[0].name,
        is_read: false,
      });
      expect(message.smtp_information.ok).to.equal(true);
      expect(message.smtp_information.data).to.deep.include({
        mail_from_addr: emailPayload.from.email,
        rcpt_to_addrs: [emailPayload.to[0].email],
      });
    });

    it('should be able to clean the inbox', async () => {
      const { accountId, inboxId } = getMailtrapSecrets();
      const inbox = await mailtrapService.cleanInbox(accountId, inboxId);

      expect(inbox).to.deep.include({
        id: inboxId,
        name: 'Regression',
        status: MailtrapInboxStatusEnum.ACTIVE,
        emails_count: 0,
        emails_unread_count: 0,
      });
    });
  });

  describe('Email channel', () => {
    const channel = ChannelTypeEnum.EMAIL;

    providers.forEach((providerId) => {
      describe(`Provider ${providerId}`, () => {
        let secrets;

        before(async () => {
          await createProviderIntegration(session, providerId, channel);
        });

        beforeEach(async () => {
          secrets = getProviderSecrets(providerId);
          await createRegressionNotificationTemplate(session, providerId);
        });

        describe('Setting up', () => {
          it('should have the proper integration active and enabled', async () => {
            const integration = await checkProviderIntegration(session, providerId);

            expect(integration).to.deep.include({
              _environmentId: session.environment._id,
              _organizationId: session.organization._id,
              providerId,
              channel,
              credentials: { apiKey: secrets.apiKey, secretKey: secrets.secretKey },
              active: true,
              deleted: false,
            });
          });

          it('should create notification template properly', async () => {
            expect(1).to.eql(0);
          });
        });
      });
    });
  });
});
