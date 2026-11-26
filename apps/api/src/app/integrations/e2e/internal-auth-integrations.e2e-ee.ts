import { HttpRequestHeaderKeysEnum } from '@novu/application-generic';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import {
  ApiAuthSchemeEnum,
  ApiServiceLevelEnum,
  ChannelTypeEnum,
  EmailProviderIdEnum,
  INTERNAL_AUTH_AUDIENCE,
  MemberRoleEnum,
  PermissionsEnum,
} from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import sinon from 'sinon';

const SECRET = 'internal-auth-integrations-e2e-secret';
const nowSeconds = () => Math.floor(Date.now() / 1000);

/**
 * The Copilot reads integrations with an `Internal` token minted for the environment the dashboard shows. It lists
 * every environment of the organization, like the member it acts for, and still writes only to its own.
 */
describe('Integrations with the internal auth scheme #novu-v2', () => {
  const { EEOrganizationRepository } = require('@novu/ee-auth');
  const integrationRepository = new IntegrationRepository();
  const environmentRepository = new EnvironmentRepository();

  let session: UserSession;
  let membershipStub: sinon.SinonStub;
  let previousSecret: string | undefined;

  function authorization() {
    const token = jwt.sign(
      {
        sub: session.user._id,
        organizationId: session.organization._id,
        environmentId: session.environment._id,
        aud: INTERNAL_AUTH_AUDIENCE,
        iat: nowSeconds(),
        exp: nowSeconds() + 60,
      },
      SECRET,
      { algorithm: 'HS256' }
    );

    return `${ApiAuthSchemeEnum.INTERNAL} ${token}`;
  }

  async function createProductionIntegration() {
    const production = await environmentRepository.findOne({
      name: 'Production',
      _organizationId: session.organization._id,
    });
    if (!production) {
      throw new Error('Expected Production environment fixture');
    }

    return integrationRepository.create({
      name: 'Production SendGrid',
      identifier: 'production-sendgrid-internal',
      providerId: EmailProviderIdEnum.SendGrid,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      credentials: { apiKey: 'SG.production', secretKey: 'production' },
      configurations: { inboundWebhookEnabled: true, inboundWebhookSigningKey: 'whsec_production' },
      _organizationId: session.organization._id,
      _environmentId: production._id,
    });
  }

  before(() => {
    previousSecret = process.env.NOVU_INTERNAL_AUTH_SECRET;
    process.env.NOVU_INTERNAL_AUTH_SECRET = SECRET;
  });

  after(() => {
    process.env.NOVU_INTERNAL_AUTH_SECRET = previousSecret ?? '';
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    await session.updateOrganizationServiceLevel(ApiServiceLevelEnum.BUSINESS);

    // The API resolves membership from Clerk, which the test server cannot reach.
    membershipStub = sinon
      .stub(EEOrganizationRepository.prototype, 'getUserOrganizationMembership')
      .callsFake(async (userId: string, organizationId: string) =>
        userId === session.user._id && organizationId === session.organization._id
          ? {
              role: MemberRoleEnum.OWNER,
              permissions: [PermissionsEnum.INTEGRATION_READ, PermissionsEnum.INTEGRATION_WRITE],
            }
          : null
      );
  });

  afterEach(() => {
    membershipStub.restore();
  });

  for (const route of ['/v1/integrations', '/v1/integrations/active']) {
    it(`lists every environment of the organization on ${route}, without secrets`, async () => {
      const productionIntegration = await createProductionIntegration();

      const { body, statusCode } = await session.testAgent
        .get(route)
        .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, authorization());

      expect(statusCode).to.equal(200);
      const environmentIds = new Set(body.data.map((integration) => integration._environmentId));
      expect(environmentIds.has(session.environment._id)).to.equal(true);
      expect(environmentIds.has(productionIntegration._environmentId)).to.equal(true);

      const listed = body.data.find((integration) => integration._id === productionIntegration._id);
      expect(listed.credentials).to.deep.equal({});
      expect(listed.configurations.inboundWebhookEnabled).to.equal(true);
      expect(listed.configurations).to.not.have.property('inboundWebhookSigningKey');
    });
  }

  it("refuses to update another environment's integration", async () => {
    const productionIntegration = await createProductionIntegration();

    const { body } = await session.testAgent
      .put(`/v1/integrations/${productionIntegration._id}`)
      .set(HttpRequestHeaderKeysEnum.AUTHORIZATION, authorization())
      .send({ name: 'Renamed by the Copilot', check: false });

    expect(body.statusCode).to.equal(403);
    const stored = await integrationRepository.findOne({
      _id: productionIntegration._id,
      _environmentId: productionIntegration._environmentId,
    });
    expect(stored?.name).to.equal('Production SendGrid');
  });
});
