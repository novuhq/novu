import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { MailtrapInboxStatusEnum, MailtrapService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { differenceInSeconds, parseISO } from 'date-fns';
import { readFile } from 'fs/promises';
import { setTimeout } from 'timers/promises';

import {
  buildSenderName,
  checkProviderIntegration,
  createProviderIntegration,
  createRegressionNotificationTemplate,
  createSubscriber,
  EMAIL_BLOCK_TEXT,
  FROM_EMAIL,
  MAILTRAP_EMAIL,
  MAILTRAP_EMAIL_BCC,
  MAILTRAP_EMAIL_CC,
  MINUTE_IN_SECONDS,
  SENDER_NAME,
  triggerEvent,
} from './helpers';
import { getMailtrapSecrets, getProviderSecrets } from './secrets';

const providers = [
  EmailProviderIdEnum.SendGrid,
  EmailProviderIdEnum.Novu,
  EmailProviderIdEnum.CustomSMTP,
  EmailProviderIdEnum.Mailjet,
  EmailProviderIdEnum.Sendinblue,
];

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
        let subscriber;
        let template;

        before(async () => {
          await createProviderIntegration(session, providerId, channel);
          subscriber = await createSubscriber(session);
        });

        beforeEach(async () => {
          secrets = getProviderSecrets(providerId);
        });

        describe('Setting up', () => {
          it('should have the proper integration active and enabled', async () => {
            const integration = await checkProviderIntegration(session, providerId);

            expect(integration).to.deep.include({
              _environmentId: session.environment._id,
              _organizationId: session.organization._id,
              providerId,
              channel,
              credentials: {
                ...secrets,
                from: FROM_EMAIL,
              },
              active: true,
              deleted: false,
            });
          });

          it('should create notification template properly', async () => {
            template = await createRegressionNotificationTemplate(session, providerId);
            expect(template.name).to.eql(`regression-template-email-${providerId}`);
            expect(template.active).to.eql(true);
            expect(template.steps[0].template.type).to.eql(channel);
          });
        });

        describe('Triggering event use cases', () => {
          beforeEach(async () => {
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

          it('should send the notification to the chosen subscriber without attachment', async () => {
            const eventTime = Date.now();
            const notification = await triggerEvent(session, providerId, subscriber.subscriberId);

            expect(notification.acknowledged).to.eql(true);
            expect(notification.status).to.eql('processed');
            expect(notification.transactionId).to.be.a('string');

            await session.awaitRunningJobs(template._id, false, 0);

            const { accountId, inboxId } = getMailtrapSecrets();
            const inboxMessages = await mailtrapService.pollInbox(accountId, inboxId);

            expect(inboxMessages.length).to.eql(1);
            const [message] = inboxMessages;

            const messageSentAt: Date = parseISO(message.sent_at);

            expect(differenceInSeconds(eventTime, messageSentAt)).to.be.lessThan(MINUTE_IN_SECONDS / 5);

            expect(message).to.deep.include({
              inbox_id: inboxId,
              subject: `Regression subject for ${providerId}`,
              from_email: FROM_EMAIL,
              from_name: buildSenderName(providerId),
              to_email: MAILTRAP_EMAIL,
              to_name: '',
              is_read: false,
              html_path: `/api/accounts/${accountId}/inboxes/${inboxId}/messages/${message.id}/body.html`,
              raw_path: `/api/accounts/${accountId}/inboxes/${inboxId}/messages/${message.id}/body.raw`,
              txt_path: `/api/accounts/${accountId}/inboxes/${inboxId}/messages/${message.id}/body.txt`,
            });

            const [txtMessage, htmlMessage, messageAttachments] = await Promise.all([
              mailtrapService.getMessageByPath(message.txt_path),
              mailtrapService.getMessageByPath(message.html_path),
              mailtrapService.getAttachment(accountId, inboxId, message.id),
            ]);

            expect(txtMessage).to.not.be.ok;
            expect(htmlMessage?.includes(EMAIL_BLOCK_TEXT)).to.eql(true);
            expect(messageAttachments).to.deep.equal([]);
          });

          it('should send the notification to the chosen subscriber with the cc and bcc', async () => {
            const overrides = {
              email: {
                cc: [MAILTRAP_EMAIL_CC],
                bcc: [MAILTRAP_EMAIL_BCC],
              },
            };
            const notification = await triggerEvent(session, providerId, subscriber.subscriberId, overrides);

            expect(notification.acknowledged).to.eql(true);
            expect(notification.status).to.eql('processed');
            expect(notification.transactionId).to.be.a('string');

            await session.awaitRunningJobs(template._id, false, 0);

            const { accountId, inboxId } = getMailtrapSecrets();
            const expectedEmails = 3;
            const inboxMessages = await mailtrapService.pollInbox(accountId, inboxId, expectedEmails);
            expect(inboxMessages.length).to.eql(expectedEmails);

            let mainMessage;
            let ccMessage;
            let bccMessage;
            for (const inboxMessage of inboxMessages) {
              const recipientToAddress = inboxMessage?.smtp_information?.data?.rcpt_to_addrs;
              const [inboxMessageFromEmail] = recipientToAddress;

              if (inboxMessageFromEmail === MAILTRAP_EMAIL) {
                mainMessage = inboxMessage;
              }
              if (inboxMessageFromEmail === MAILTRAP_EMAIL_CC) {
                ccMessage = inboxMessage;
              }
              if (inboxMessageFromEmail === MAILTRAP_EMAIL_BCC) {
                bccMessage = inboxMessage;
              }
            }

            expect(mainMessage).to.be.ok;
            expect(ccMessage).to.be.ok;
            expect(bccMessage).to.be.ok;

            const messages = [mainMessage, ccMessage, bccMessage];
            const emails = [MAILTRAP_EMAIL, MAILTRAP_EMAIL_CC, MAILTRAP_EMAIL_BCC];

            for (const [index, message] of messages.entries()) {
              expect(message).to.deep.include({
                inbox_id: inboxId,
                subject: `Regression subject for ${providerId}`,
                from_email: FROM_EMAIL,
                from_name: buildSenderName(providerId),
                to_email: MAILTRAP_EMAIL,
                to_name: '',
                is_read: false,
                html_path: `/api/accounts/${accountId}/inboxes/${inboxId}/messages/${message.id}/body.html`,
                raw_path: `/api/accounts/${accountId}/inboxes/${inboxId}/messages/${message.id}/body.raw`,
                txt_path: `/api/accounts/${accountId}/inboxes/${inboxId}/messages/${message.id}/body.txt`,
              });

              expect(message.smtp_information.data.rcpt_to_addrs).to.deep.equal([emails[index]]);

              const [txtMessage, htmlMessage, messageAttachments] = await Promise.all([
                mailtrapService.getMessageByPath(message.txt_path),
                mailtrapService.getMessageByPath(message.html_path),
                mailtrapService.getAttachment(accountId, inboxId, message.id),
              ]);

              expect(txtMessage).to.not.be.ok;
              expect(htmlMessage?.includes(EMAIL_BLOCK_TEXT)).to.eql(true);
              expect(messageAttachments).to.deep.equal([]);
            }
          });
        });
      });
    });
  });
});
