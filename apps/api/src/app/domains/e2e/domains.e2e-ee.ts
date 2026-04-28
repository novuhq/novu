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

describe('Domains API - /v1/domains #novu-v2', () => {
  let session: UserSession;
  let novuClient: Novu;

  before(() => {
    process.env.MAIL_SERVER_DOMAIN = process.env.MAIL_SERVER_DOMAIN || 'mail.e2e.example.test';
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    novuClient = initNovuClassSdkInternalAuth(session);
  });

  function uniqueDomainName(): string {
    return `e2e-${randomBytes(6).toString('hex')}.example.test`;
  }

  it('should create a domain with pending status', async () => {
    const name = uniqueDomainName();

    const { result: domain } = await novuClient.domains.create({ name });

    expect(domain.id).to.be.a('string');
    expect(domain.name).to.equal(name);
    expect(domain.status).to.equal('pending');
    expect(domain.mxRecordConfigured).to.equal(false);
    expect(domain.environmentId).to.equal(session.environment._id);
    expect(domain.organizationId).to.equal(session.organization._id);
    expect(domain.expectedDnsRecords).to.deep.equal([
      {
        type: 'MX',
        name,
        content: process.env.MAIL_SERVER_DOMAIN,
        ttl: 'Auto',
        priority: 10,
      },
    ]);
  });

  it('should return 409 when creating a duplicate domain name in the same environment', async () => {
    const name = uniqueDomainName();

    await novuClient.domains.create({ name });

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.create({ name }));

    expect(error?.statusCode).to.equal(409);
  });

  it('should reject create with empty name (422)', async () => {
    const { error } = await expectSdkValidationExceptionGeneric(() => novuClient.domains.create({ name: '' }));

    expect(error?.statusCode).to.equal(422);
  });

  it('should reject invalid domain names (422)', async () => {
    const invalidNames = [
      'https://novu.co',
      'novu.co/path',
      'novu',
      'inbound_novu.co',
      '-novu.co',
      'novu-.co',
      'novu.c',
    ];

    for (const name of invalidNames) {
      const { error } = await expectSdkValidationExceptionGeneric(() => novuClient.domains.create({ name }));

      expect(error?.statusCode).to.equal(422);
    }
  });

  it('should normalize domain names to lowercase', async () => {
    const name = `E2E-${randomBytes(6).toString('hex')}.Inbound.Example.Test`;

    const { result: domain } = await novuClient.domains.create({ name });

    expect(domain.name).to.equal(name.toLowerCase());
  });

  it('should retrieve a domain by name', async () => {
    const name = uniqueDomainName();
    const { result: created } = await novuClient.domains.create({ name });

    const { result: fetched } = await novuClient.domains.retrieve(created.name);

    expect(fetched.id).to.equal(created.id);
    expect(fetched.name).to.equal(name);
    expect(fetched.expectedDnsRecords).to.deep.equal(created.expectedDnsRecords);
  });

  it('should return 404 when retrieving a non-existent domain', async () => {
    const fakeDomain = 'missing.example.test';

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.retrieve(fakeDomain));

    expect(error?.statusCode).to.equal(404);
  });

  it('should list domains with pagination metadata', async () => {
    const prefix = `list-${randomBytes(4).toString('hex')}`;
    const names = [0, 1, 2].map((i) => `${prefix}-${i}.example.test`);

    for (const name of names) {
      await novuClient.domains.create({ name });
    }

    const { result } = await novuClient.domains.list({});

    expect(result.data.length).to.be.at.least(3);
    expect(result).to.have.property('next');
    expect(result).to.have.property('previous');
    expect(result).to.have.property('totalCount');
    expect(result).to.have.property('totalCountCapped');
    expect(result.data.every((d) => d.environmentId === session.environment._id)).to.equal(true);
  });

  it('should filter domains by name', async () => {
    const marker = `marker-${randomBytes(5).toString('hex')}`;
    const name = `${marker}.filter.example.test`;

    await novuClient.domains.create({ name });

    const { result } = await novuClient.domains.list({ name: marker });

    expect(result.data.length).to.be.at.least(1);
    expect(result.data.some((d) => d.name === name)).to.equal(true);
  });

  it('should paginate domains with cursors without overlap', async () => {
    const prefix = `page-${randomBytes(4).toString('hex')}`;
    const names = [0, 1, 2].map((i) => `${prefix}-${i}.example.test`);

    for (const name of names) {
      await novuClient.domains.create({ name });
    }

    const limit = 1;
    const firstPage = await novuClient.domains.list({ limit });

    expect(firstPage.result.data.length).to.equal(limit);
    expect(firstPage.result.next).to.be.a('string');
    expect(firstPage.result.previous).to.be.null;

    const secondPage = await novuClient.domains.list({
      limit,
      after: firstPage.result.next as string,
    });

    expect(secondPage.result.data.length).to.be.at.most(limit);
    expect(secondPage.result.previous).to.be.a('string');

    const firstIds = firstPage.result.data.map((d) => d.id);
    const secondIds = secondPage.result.data.map((d) => d.id);
    const overlap = firstIds.filter((id) => secondIds.includes(id));

    expect(overlap.length).to.equal(0);
  });

  it('should accept PATCH with empty body as a no-op', async () => {
    const name = uniqueDomainName();
    const { result: created } = await novuClient.domains.create({ name });

    const { result: updated } = await novuClient.domains.update({}, created.name);

    expect(updated.id).to.equal(created.id);
    expect(updated.name).to.equal(name);
    expect(updated.status).to.equal(created.status);
  });

  it('should create a domain with valid data metadata', async () => {
    const name = uniqueDomainName();

    const { result: domain } = await novuClient.domains.create({
      name,
      data: { tier: 'pro', region: 'eu' },
    });

    expect(domain.data).to.deep.equal({ tier: 'pro', region: 'eu' });
  });

  it('should reject domain data with more than 10 keys (422)', async () => {
    const name = uniqueDomainName();
    const data = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`k${i}`, 'a']));

    const { error } = await expectSdkValidationExceptionGeneric(() => novuClient.domains.create({ name, data }));

    expect(error?.statusCode).to.equal(422);
  });

  it('should reject domain data exceeding total char budget (422)', async () => {
    const name = uniqueDomainName();
    const longValue = 'x'.repeat(498);

    const { error } = await expectSdkValidationExceptionGeneric(() =>
      novuClient.domains.create({
        name,
        data: { a: longValue, b: 'yy' },
      })
    );

    expect(error?.statusCode).to.equal(422);
  });

  it('should replace domain data on PATCH', async () => {
    const name = uniqueDomainName();
    const { result: created } = await novuClient.domains.create({
      name,
      data: { a: '1' },
    });

    const { result: patched } = await novuClient.domains.update({ data: { b: '2' } }, created.name);

    expect(patched.data).to.deep.equal({ b: '2' });
  });

  it('should refresh verification status via verify endpoint', async () => {
    const name = uniqueDomainName();
    const { result: created } = await novuClient.domains.create({ name });

    const { result: verified } = await novuClient.domains.verify(created.name);

    expect(verified.id).to.equal(created.id);
    expect(verified.name).to.equal(name);
    expect(['pending', 'verified']).to.include(verified.status);
  });

  it('should return 404 when verifying a non-existent domain', async () => {
    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.verify('missing.example.test'));

    expect(error?.statusCode).to.equal(404);
  });

  it('should delete a domain and return 404 on subsequent retrieve', async () => {
    const name = uniqueDomainName();
    const { result: created } = await novuClient.domains.create({ name });

    await novuClient.domains.delete(created.name);

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.retrieve(created.name));

    expect(error?.statusCode).to.equal(404);
  });

  it('should delete a domain and cascade-remove its routes', async () => {
    const name = uniqueDomainName();
    const { result: domain } = await novuClient.domains.create({ name });

    await novuClient.domains.routes.create({ address: 'cascade', type: DomainRouteDtoType.Webhook }, domain.name);

    const before = await novuClient.domains.routes.list({ domain: domain.name });

    expect(before.result.data.some((r) => r.address === 'cascade')).to.equal(true);

    await novuClient.domains.delete(domain.name);

    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.routes.list({ domain: domain.name }));

    expect(error?.statusCode).to.equal(404);
  });
});
