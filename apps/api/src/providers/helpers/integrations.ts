import { IntegrationService as TestingIntegrationService, UserSession } from '@novu/testing';
import { IntegrationEntity, IntegrationQuery } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';

import { getProviderSecrets } from '../secrets';

const integrationService = new TestingIntegrationService();

export const createProviderIntegration = async (
  session: UserSession,
  providerId: EmailProviderIdEnum,
  channel: ChannelTypeEnum
): Promise<void> => {
  const credentials = getProviderSecrets(providerId);

  const _environmentId = session.environment._id;
  const _organizationId = session.organization._id;

  const activeIntegration = await integrationService.findActiveIntegrationForChannel(_environmentId, channel);

  if (activeIntegration) {
    await integrationService.deleteIntegration(activeIntegration._id, _environmentId, _organizationId);
  }

  const emailIntegrationEntity = {
    _environmentId,
    _organizationId,
    providerId,
    channel,
    credentials,
    active: true,
  } satisfies IntegrationQuery;

  const result = await integrationService.createEmailIntegration(emailIntegrationEntity);

  expect(result).to.deep.include({
    _environmentId,
    _organizationId,
    providerId,
    channel,
    credentials,
    active: true,
  });
};

export const checkProviderIntegration = async (
  session: UserSession,
  providerId: EmailProviderIdEnum
): Promise<IntegrationEntity> => {
  const integrations = await integrationService.findIntegration(
    session.environment._id,
    session.organization._id,
    providerId
  );

  expect(integrations.length).to.eql(1);

  const [providerIntegration] = integrations;

  return providerIntegration;
};
