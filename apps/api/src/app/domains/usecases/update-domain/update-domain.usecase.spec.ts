import { BadRequestException } from '@nestjs/common';
import { expect } from 'chai';
import { stub } from 'sinon';

import { UpdateDomain } from './update-domain.usecase';

describe('UpdateDomain usecase', () => {
  const previousMailServerDomain = process.env.MAIL_SERVER_DOMAIN;

  beforeEach(() => {
    process.env.MAIL_SERVER_DOMAIN = 'mail.novu.co';
  });

  afterEach(() => {
    if (previousMailServerDomain === undefined) {
      delete process.env.MAIL_SERVER_DOMAIN;
    } else {
      process.env.MAIL_SERVER_DOMAIN = previousMailServerDomain;
    }
  });

  const existing = {
    _id: 'domain-id',
    name: 'inbound.example.com',
    status: 'pending',
    mxRecordConfigured: false,
    data: { team: 'support' },
    inboundSenderAuth: { dkim: false },
    _environmentId: 'env-id',
    _organizationId: 'org-id',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const baseCommand = {
    domain: 'inbound.example.com',
    environmentId: 'env-id',
    organizationId: 'org-id',
    userId: 'user-id',
  };

  function buildUsecase(domain = existing) {
    const domainRepository = {
      findOne: stub().resolves(domain),
      findOneAndUpdate: stub().callsFake((_query: unknown, update: { $set: Record<string, unknown> }) =>
        Promise.resolve({ ...domain, ...update.$set })
      ),
    };

    return { usecase: new UpdateDomain(domainRepository as any), domainRepository };
  }

  it('merges one flag without clearing the other and returns both effective flags', async () => {
    const { usecase, domainRepository } = buildUsecase();

    const result = await usecase.execute({ ...baseCommand, inboundSenderAuth: { spf: true } });

    expect(domainRepository.findOneAndUpdate.firstCall.args[1].$set.inboundSenderAuth).to.deep.equal({
      dkim: false,
      spf: true,
    });
    expect(domainRepository.findOneAndUpdate.firstCall.args[1].$set.data).to.equal(undefined);
    expect(result.inboundSenderAuth).to.deep.equal({ dkim: false, spf: true });
    expect(result.data).to.deep.equal({ team: 'support' });
  });

  it('rejects a merge that disables both checks', async () => {
    const { usecase, domainRepository } = buildUsecase();

    try {
      await usecase.execute({ ...baseCommand, inboundSenderAuth: { spf: false } });
      throw new Error('Expected execute to throw');
    } catch (err) {
      expect(err).to.be.instanceOf(BadRequestException);
      expect((err as BadRequestException).message).to.include('at least one of DKIM or SPF');
    }

    expect(domainRepository.findOneAndUpdate.called).to.equal(false);
  });

  it('leaves sender auth unchanged when the patch omits it', async () => {
    const { usecase, domainRepository } = buildUsecase();

    const result = await usecase.execute({ ...baseCommand, data: { team: 'billing' } });

    expect(domainRepository.findOneAndUpdate.firstCall.args[1].$set).to.deep.equal({ data: { team: 'billing' } });
    expect(result.inboundSenderAuth).to.deep.equal({ dkim: false, spf: true });
  });
});
