import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';

import { checkProviderIntegration, createProviderIntegration, createRegressionNotificationTemplate } from './helpers';
import { getProviderSecrets } from './secrets';

const providers = [EmailProviderIdEnum.SendGrid];

let session: UserSession;

describe('Regression test - Providers', () => {
  before(async () => {
    session = new UserSession();
    await session.initialize();
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
