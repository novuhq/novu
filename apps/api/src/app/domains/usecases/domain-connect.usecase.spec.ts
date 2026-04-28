import { generateKeyPairSync } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import type { DomainEntity } from '@novu/dal';
import { DomainStatusEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';
import { DomainConnectStatusReasonEnum } from '../dtos/domain-connect-status-response.dto';
import { CreateDomainConnectApplyUrl } from './create-domain-connect-apply-url/create-domain-connect-apply-url.usecase';
import { GetDomainConnectStatus } from './get-domain-connect-status/get-domain-connect-status.usecase';

describe('Domain Connect usecases', () => {
  const previousEnv = { ...process.env };
  const domain = {
    _id: 'domain-id',
    name: 'example.com',
    status: DomainStatusEnum.PENDING,
    mxRecordConfigured: false,
    _environmentId: 'environment-id',
    _organizationId: 'organization-id',
  } as DomainEntity;
  const command = {
    domain: 'example.com',
    environmentId: 'environment-id',
    organizationId: 'organization-id',
    userId: 'user-id',
  };
  let domainRepositoryMock;
  let featureFlagsServiceMock;
  let domainConnectDiscoveryServiceMock;

  beforeEach(() => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });

    process.env.MAIL_SERVER_DOMAIN = 'mail.novu.co';
    process.env.DOMAIN_CONNECT_PRIVATE_KEY = privateKey;
    process.env.DASHBOARD_URL = 'https://dashboard.novu.co';
    domainRepositoryMock = {
      findOne: stub().resolves(domain),
    };
    featureFlagsServiceMock = {
      getFlag: stub().resolves(true),
    };
    domainConnectDiscoveryServiceMock = {
      discoverDomainConnectHost: stub().resolves({
        domainName: 'example.com',
        providerHost: 'domainconnect.vercel.com',
      }),
      fetchProviderSettings: stub().resolves({
        providerDisplayName: 'Vercel',
        urlSyncUX: 'https://vercel.com/domain-connect',
        urlAPI: 'https://vercel.com/api/domain-connect',
      }),
      isTemplateSupported: stub().resolves(true),
    };
  });

  afterEach(() => {
    restore();
    process.env = { ...previousEnv };
  });

  it('returns manual fallback for unsupported Domain Connect providers', async () => {
    domainConnectDiscoveryServiceMock.discoverDomainConnectHost.resolves({
      domainName: 'example.com',
      providerHost: 'domainconnect.unsupported.example.com',
    });
    const usecase = new GetDomainConnectStatus(
      domainRepositoryMock,
      featureFlagsServiceMock,
      domainConnectDiscoveryServiceMock
    );

    const result = await usecase.execute(command);

    expect(result.available).to.equal(false);
    expect(result.reason).to.equal('Domain Connect auto-configuration currently supports Cloudflare and Vercel.');
    expect(
      featureFlagsServiceMock.getFlag.calledWithMatch({
        key: FeatureFlagsKeysEnum.IS_DOMAIN_CONNECT_INBOUND_EMAIL_ENABLED,
      })
    ).to.equal(true);
    expect(domainConnectDiscoveryServiceMock.fetchProviderSettings.called).to.equal(false);
  });

  it('returns manual fallback without discovery when Domain Connect is disabled', async () => {
    featureFlagsServiceMock.getFlag.resolves(false);
    const usecase = new GetDomainConnectStatus(
      domainRepositoryMock,
      featureFlagsServiceMock,
      domainConnectDiscoveryServiceMock
    );

    const result = await usecase.execute(command);

    expect(result.available).to.equal(false);
    expect(result.reason).to.equal('Domain Connect auto-configuration is not enabled.');
    expect(result.reasonCode).to.equal(DomainConnectStatusReasonEnum.DISABLED);
    expect(domainConnectDiscoveryServiceMock.discoverDomainConnectHost.called).to.equal(false);
    expect(domainConnectDiscoveryServiceMock.fetchProviderSettings.called).to.equal(false);
  });

  it('rejects untrusted provider settings URLs before checking template support', async () => {
    domainConnectDiscoveryServiceMock.fetchProviderSettings.resolves({
      urlSyncUX: 'https://vercel.com/domain-connect',
      urlAPI: 'https://evil.example.com/api/domain-connect',
    });
    const usecase = new GetDomainConnectStatus(
      domainRepositoryMock,
      featureFlagsServiceMock,
      domainConnectDiscoveryServiceMock
    );

    const result = await usecase.execute(command);

    expect(result.available).to.equal(false);
    expect(result.reason).to.equal('This DNS provider did not return a trusted synchronous Domain Connect flow.');
    expect(domainConnectDiscoveryServiceMock.isTemplateSupported.called).to.equal(false);
  });

  it('returns distinct fallback when provider settings cannot be retrieved', async () => {
    domainConnectDiscoveryServiceMock.fetchProviderSettings.resolves(undefined);
    const usecase = new GetDomainConnectStatus(
      domainRepositoryMock,
      featureFlagsServiceMock,
      domainConnectDiscoveryServiceMock
    );

    const result = await usecase.execute(command);

    expect(result.available).to.equal(false);
    expect(result.reasonCode).to.equal(DomainConnectStatusReasonEnum.PROVIDER_SETTINGS_UNAVAILABLE);
    expect(result.reason).to.equal(
      'Failed to retrieve provider settings. Please try manual setup or refresh the status.'
    );
  });

  it('uses discovered root domain provider settings for submitted subdomains', async () => {
    domainRepositoryMock.findOne.resolves({ ...domain, name: 'inbound.example.com' });
    domainConnectDiscoveryServiceMock.discoverDomainConnectHost.resolves({
      domainName: 'example.com',
      providerHost: 'domainconnect.vercel.com',
    });
    const usecase = new GetDomainConnectStatus(
      domainRepositoryMock,
      featureFlagsServiceMock,
      domainConnectDiscoveryServiceMock
    );

    const result = await usecase.execute(command);

    expect(result.available).to.equal(true);
    expect(
      domainConnectDiscoveryServiceMock.fetchProviderSettings.calledWith('example.com', 'domainconnect.vercel.com')
    ).to.equal(true);
  });

  it('rejects apply URL creation when signing config is missing', async () => {
    delete process.env.DOMAIN_CONNECT_PRIVATE_KEY;
    const usecase = new CreateDomainConnectApplyUrl(
      domainRepositoryMock,
      featureFlagsServiceMock,
      domainConnectDiscoveryServiceMock
    );

    await expectRejectedWith(
      usecase.execute(command),
      BadRequestException,
      'Domain Connect signing configuration is incomplete.'
    );
  });

  it('rejects cross-origin redirect URIs through apply URL creation', async () => {
    const usecase = new CreateDomainConnectApplyUrl(
      domainRepositoryMock,
      featureFlagsServiceMock,
      domainConnectDiscoveryServiceMock
    );

    await expectRejectedWith(
      usecase.execute({ ...command, redirectUri: 'https://evil.example.com/callback' }),
      BadRequestException,
      'Domain Connect redirect URI origin is not allowed.'
    );
  });
});

async function expectRejectedWith(promise: Promise<unknown>, errorClass: typeof BadRequestException, message: string) {
  try {
    await promise;
    throw new Error('Expected promise to reject.');
  } catch (error) {
    expect(error).to.be.instanceOf(errorClass);
    expect((error as Error).message).to.equal(message);
  }
}
