import { generateKeyPairSync } from 'node:crypto';
import { promises as dnsPromises } from 'node:dns';
import { BadRequestException } from '@nestjs/common';
import type { DomainEntity } from '@novu/dal';
import { DomainStatusEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import { of } from 'rxjs';
import { restore, stub } from 'sinon';
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
    domainId: 'domain-id',
    environmentId: 'environment-id',
    organizationId: 'organization-id',
    userId: 'user-id',
  };
  let domainRepositoryMock;
  let httpServiceMock;
  let featureFlagsServiceMock;
  let loggerMock;

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
      findOneByIdAndEnvironment: stub().resolves(domain),
    };
    httpServiceMock = {
      get: stub(),
    };
    featureFlagsServiceMock = {
      getFlag: stub().resolves(true),
    };
    loggerMock = {
      setContext: stub(),
      warn: stub(),
    };
  });

  afterEach(() => {
    restore();
    process.env = { ...previousEnv };
  });

  it('returns manual fallback for unsupported Domain Connect providers', async () => {
    stub(dnsPromises, 'resolveTxt').resolves([['domainconnect.unsupported.example.com']]);
    const usecase = new GetDomainConnectStatus(
      domainRepositoryMock,
      httpServiceMock,
      featureFlagsServiceMock,
      loggerMock
    );

    const result = await usecase.execute(command);

    expect(result.available).to.equal(false);
    expect(result.reason).to.equal('Domain Connect auto-configuration currently supports Cloudflare and Vercel.');
    expect(
      featureFlagsServiceMock.getFlag.calledWithMatch({
        key: FeatureFlagsKeysEnum.IS_DOMAIN_CONNECT_INBOUND_EMAIL_ENABLED,
      })
    ).to.equal(true);
    expect(httpServiceMock.get.called).to.equal(false);
  });

  it('returns manual fallback without discovery when Domain Connect is disabled', async () => {
    featureFlagsServiceMock.getFlag.resolves(false);
    const resolveTxt = stub(dnsPromises, 'resolveTxt');
    const usecase = new GetDomainConnectStatus(
      domainRepositoryMock,
      httpServiceMock,
      featureFlagsServiceMock,
      loggerMock
    );

    const result = await usecase.execute(command);

    expect(result.available).to.equal(false);
    expect(result.reason).to.equal('Domain Connect auto-configuration is not enabled.');
    expect(resolveTxt.called).to.equal(false);
    expect(httpServiceMock.get.called).to.equal(false);
  });

  it('rejects untrusted provider settings URLs before checking template support', async () => {
    stub(dnsPromises, 'resolveTxt').resolves([['domainconnect.vercel.com']]);
    httpServiceMock.get.returns(
      of({
        data: {
          urlSyncUX: 'https://vercel.com/domain-connect',
          urlAPI: 'https://evil.example.com/api/domain-connect',
        },
      })
    );
    const usecase = new GetDomainConnectStatus(
      domainRepositoryMock,
      httpServiceMock,
      featureFlagsServiceMock,
      loggerMock
    );

    const result = await usecase.execute(command);

    expect(result.available).to.equal(false);
    expect(result.reason).to.equal('This DNS provider did not return a trusted synchronous Domain Connect flow.');
    expect(httpServiceMock.get.calledOnce).to.equal(true);
  });

  it('discovers Domain Connect settings on the root domain for submitted subdomains', async () => {
    domainRepositoryMock.findOneByIdAndEnvironment.resolves({ ...domain, name: 'inbound.example.com' });
    stub(dnsPromises, 'resolveTxt').resolves([['domainconnect.vercel.com']]);
    httpServiceMock.get.onFirstCall().returns(
      of({
        data: {
          providerDisplayName: 'Vercel',
          urlSyncUX: 'https://vercel.com/domain-connect',
          urlAPI: 'https://vercel.com/api/domain-connect',
        },
      })
    );
    httpServiceMock.get.onSecondCall().returns(of({ data: {} }));
    const usecase = new GetDomainConnectStatus(
      domainRepositoryMock,
      httpServiceMock,
      featureFlagsServiceMock,
      loggerMock
    );

    const result = await usecase.execute(command);

    expect(result.available).to.equal(true);
    expect(httpServiceMock.get.firstCall.args[0]).to.equal('https://domainconnect.vercel.com/v2/example.com/settings');
  });

  it('rejects apply URL creation when signing config is missing', async () => {
    delete process.env.DOMAIN_CONNECT_PRIVATE_KEY;
    stub(dnsPromises, 'resolveTxt').resolves([['domainconnect.vercel.com']]);
    httpServiceMock.get.onFirstCall().returns(
      of({
        data: {
          urlSyncUX: 'https://vercel.com/domain-connect',
          urlAPI: 'https://vercel.com/api/domain-connect',
        },
      })
    );
    httpServiceMock.get.onSecondCall().returns(of({ data: {} }));
    const usecase = new CreateDomainConnectApplyUrl(
      domainRepositoryMock,
      httpServiceMock,
      featureFlagsServiceMock,
      loggerMock
    );

    try {
      await usecase.execute(command);
      throw new Error('Expected apply URL creation to fail.');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect((error as BadRequestException).message).to.equal('Domain Connect signing configuration is incomplete.');
    }
  });

  it('rejects cross-origin redirect URIs through apply URL creation', async () => {
    stub(dnsPromises, 'resolveTxt').resolves([['domainconnect.vercel.com']]);
    httpServiceMock.get.onFirstCall().returns(
      of({
        data: {
          urlSyncUX: 'https://vercel.com/domain-connect',
          urlAPI: 'https://vercel.com/api/domain-connect',
        },
      })
    );
    httpServiceMock.get.onSecondCall().returns(of({ data: {} }));
    const usecase = new CreateDomainConnectApplyUrl(
      domainRepositoryMock,
      httpServiceMock,
      featureFlagsServiceMock,
      loggerMock
    );

    try {
      await usecase.execute({ ...command, redirectUri: 'https://evil.example.com/callback' });
      throw new Error('Expected apply URL creation to fail.');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect((error as BadRequestException).message).to.equal('Domain Connect redirect URI origin is not allowed.');
    }
  });
});
