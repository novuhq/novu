import { randomBytes } from 'node:crypto';
import { Novu } from '@novu/api';
import { DomainRouteDtoType } from '@novu/api/models/components';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  expectSdkExceptionGeneric,
  expectSdkValidationExceptionGeneric,
  initNovuClassSdkInternalAuth,
} from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Domain route test API - /v1/domains/:domain/routes/:address/test #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  before(() => {
    (process.env as { IS_CONVERSATIONAL_AGENTS_ENABLED?: string }).IS_CONVERSATIONAL_AGENTS_ENABLED = 'true';
    process.env.MAIL_SERVER_DOMAIN = process.env.MAIL_SERVER_DOMAIN || 'mail.e2e.example.test';
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  function uniqueDomainName(): string {
    return `e2e-test-route-${randomBytes(6).toString('hex')}.example.test`;
  }

  it('should return matched false when the address has no route', async () => {
    const name = uniqueDomainName();
    const { result: domain } = await novuClient.domains.create({ name });

    const { result } = await novuClient.domains.routes.test(
      {
        from: { address: 'sender@example.com' },
        subject: 'Test',
        text: 'Ping',
        dryRun: true,
      },
      domain.name,
      'nope'
    );

    expect(result.matched).to.equal(false);
    expect(result.dryRun).to.equal(true);
  });

  it('should dry-run a webhook route without delivering', async () => {
    const name = uniqueDomainName();
    const { result: domain } = await novuClient.domains.create({ name });

    await novuClient.domains.routes.create({ address: 'support', type: DomainRouteDtoType.Webhook }, domain.name);

    const { result } = await novuClient.domains.routes.test(
      {
        from: { address: 'sender@example.com' },
        subject: 'Test',
        text: 'Ping',
        dryRun: true,
      },
      domain.name,
      'support'
    );

    expect(result.matched).to.equal(true);
    expect(result.dryRun).to.equal(true);
    expect(result.type).to.equal('webhook');
    expect(result.payload).to.be.an('object');
  });

  it('should return 404 when testing a route on a missing domain', async () => {
    const { error } = await expectSdkExceptionGeneric(() =>
      novuClient.domains.routes.test(
        {
          from: { address: 'sender@example.com' },
          subject: 'Test',
          dryRun: true,
        },
        'missing.example.test',
        'support'
      )
    );

    expect(error?.statusCode).to.equal(404);
  });

  it('should reject invalid from email (422)', async () => {
    const name = uniqueDomainName();
    const { result: domain } = await novuClient.domains.create({ name });

    await novuClient.domains.routes.create({ address: 'support', type: DomainRouteDtoType.Webhook }, domain.name);

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.domains.routes.test(
        {
          from: { address: 'not-an-email' },
          subject: 'Test',
          dryRun: true,
        },
        domain.name,
        'support'
      )
    );

    expect(error?.statusCode).to.equal(422);
  });
});
