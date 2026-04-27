import { randomBytes } from 'node:crypto';
import { Novu } from '@novu/api';
import { DomainRouteDtoType } from '@novu/api/models/components';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import {
  expectSdkExceptionGeneric,
  initNovuClassSdkInternalAuth,
} from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

const NS_UNRESOLVABLE_CODE = 'ns_unresolvable';

describe('Domain DNS diagnose API - /v1/domains/:domain/diagnose #novu-v2', () => {
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
    return `e2e-diag-${randomBytes(6).toString('hex')}.example.test`;
  }

  it('should return 404 when diagnosing a missing domain', async () => {
    const { error } = await expectSdkExceptionGeneric(() => novuClient.domains.diagnose('missing.example.test'));

    expect(error?.statusCode).to.equal(404);
  });

  it('should return structured checks and issues for an existing domain', async () => {
    const name = uniqueDomainName();
    const { result: domain } = await novuClient.domains.create({ name });

    await novuClient.domains.routes.create({ address: 'x', type: DomainRouteDtoType.Webhook }, domain.name);

    const { result: diagnosis } = await novuClient.domains.diagnose(domain.name);

    expect(diagnosis).to.have.property('ok');
    expect(diagnosis).to.have.property('runAt');
    expect(diagnosis.checks).to.be.an('array');
    expect(diagnosis.checks.length).to.be.at.least(1);
    expect(diagnosis.issues).to.be.an('array');
    expect(diagnosis.checks.every((c) => typeof c.latencyMs === 'number')).to.equal(true);
    expect(diagnosis.checks.some((c) => c.code === NS_UNRESOLVABLE_CODE)).to.equal(false);
    expect(diagnosis.issues.some((issue) => issue.code === NS_UNRESOLVABLE_CODE)).to.equal(false);
  });
});
