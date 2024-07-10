import { expect } from 'chai';
import { UserSession } from '@novu/testing';
import { ClerkClientMock } from '@novu/ee-auth';
import {
  ApiServiceLevelEnum,
  EmailProviderIdEnum,
  JobTitleEnum,
  Organization,
  SmsProviderIdEnum,
  UpdateExternalOrganizationDto,
  User,
} from '@novu/shared';
import { EnvironmentRepository, IntegrationRepository, OrganizationEntity } from '@novu/dal';

// TODO: rework to clerk webhook
describe.skip('Sync Organization - /organizations (POST)', async () => {
  let session: UserSession;
  let clerkClientMock: ClerkClientMock;
  let clerkUser: User;
  let clerkOrganization: Organization;
  let internalOrganization: OrganizationEntity;

  const integrationRepository = new IntegrationRepository();
  const environmentRepository = new EnvironmentRepository();

  const testOrganization: UpdateExternalOrganizationDto = {
    jobTitle: JobTitleEnum.ENGINEER,
    domain: 'example.com',
    productUseCases: {
      in_app: true,
      delay: true,
    },
  };

  function getRequest(payload: UpdateExternalOrganizationDto, origin: string = process.env.FRONT_BASE_URL) {
    return session.testAgent.post('/v1/organizations/').set('origin', origin).send(payload);
  }

  before(async () => {
    session = new UserSession();
    clerkClientMock = new ClerkClientMock();

    // must be an existing Clerk user in an existing Clerk organization
    clerkUser = await clerkClientMock.users.getUser('clerk_user_1');
    clerkOrganization = await clerkClientMock.organizations.getOrganization({ organizationId: 'clerk_org_1' });

    await session.updateEETokenClaims({
      _id: clerkUser.id,
      org_id: clerkOrganization.id,
      externalId: clerkUser.externalId!, // null before syncing
      externalOrgId: clerkOrganization.publicMetadata.externalOrgId, // null before syncing
    });

    // sync the user first since the organization is dependent on the existing synced userId
    await session.testAgent.post('/v1/users').set('origin', process.env.FRONT_BASE_URL).expect(201);

    // TODO: ee-billing is not mocked and throws an error here
    const { body } = await getRequest(testOrganization).expect(201);
    internalOrganization = body.data;
  });

  it('should throw an error when internal organization already exists for Clerk organization', async () => {
    const { body } = await getRequest(testOrganization).expect(400);

    expect(body.message).to.equal(`Internal organization with externalId: ${clerkOrganization.id} already exists`);
  });

  it('should throw an error when Clerk organization does not exist', async () => {
    const id = 'not_existing_org_id';
    await session.updateEETokenClaims({
      _id: clerkUser.id,
      org_id: id,
      externalId: clerkUser.externalId!,
      externalOrgId: undefined,
    });

    const { body } = await getRequest(testOrganization).expect(400);

    expect(body.message).to.equal(`Clerk organization with id: ${id} does not exist`);
  });

  it('should not allow API call from different origin than Novu frontend', async () => {
    const origin = 'https://external.com';
    const { body } = await getRequest(testOrganization, origin).expect(403);

    expect(body.message).to.equal('Forbidden');
  });

  it('should create internal organization with externalId of given existing Clerk organization and metadata', async () => {
    const updatedClerkOrganization: Organization = await clerkClientMock.organizations.getOrganization({
      organizationId: clerkOrganization.id,
    });

    expect(internalOrganization._id).to.equal(updatedClerkOrganization.publicMetadata.externalOrgId);
    expect(internalOrganization.externalId).to.equal(updatedClerkOrganization.id);

    // these are stored in the Clerk organization only and then concatenated with the response
    expect(internalOrganization.name).to.equal(updatedClerkOrganization.name);
    expect(internalOrganization.logo).to.equal(updatedClerkOrganization.imageUrl);
  });

  it('should have all internal attributes set correctly', async () => {
    expect(internalOrganization.domain).to.equal(testOrganization.domain);
    expect(internalOrganization.productUseCases?.in_app).to.eq(testOrganization.productUseCases?.in_app);
    expect(internalOrganization.productUseCases?.delay).to.eq(testOrganization.productUseCases?.delay);
    expect(internalOrganization.apiServiceLevel).to.eq(ApiServiceLevelEnum.FREE);
  });

  it('should update user job title on organization creation', async () => {
    clerkUser = await clerkClientMock.users.getUser('clerk_user_1');

    expect(clerkUser.publicMetadata.jobTitle).to.eq(testOrganization.jobTitle);
  });

  it('should create organization with built in Novu integrations and set them as primary', async () => {
    const integrations = await integrationRepository.find({ _organizationId: internalOrganization._id });
    const environments = await environmentRepository.find({ _organizationId: internalOrganization._id });
    const productionEnv = environments.find((e) => e.name === 'Production');
    const developmentEnv = environments.find((e) => e.name === 'Development');
    const novuEmailIntegration = integrations.filter(
      (i) => i.active && i.name === 'Novu Email' && i.providerId === EmailProviderIdEnum.Novu
    );
    const novuSmsIntegration = integrations.filter(
      (i) => i.active && i.name === 'Novu SMS' && i.providerId === SmsProviderIdEnum.Novu
    );
    const novuEmailIntegrationProduction = novuEmailIntegration.filter(
      (el) => el._environmentId === productionEnv?._id
    );
    const novuEmailIntegrationDevelopment = novuEmailIntegration.filter(
      (el) => el._environmentId === developmentEnv?._id
    );
    const novuSmsIntegrationProduction = novuSmsIntegration.filter((el) => el._environmentId === productionEnv?._id);
    const novuSmsIntegrationDevelopment = novuSmsIntegration.filter((el) => el._environmentId === developmentEnv?._id);

    expect(integrations.length).to.eq(4);
    expect(novuEmailIntegration?.length).to.eq(2);
    expect(novuSmsIntegration?.length).to.eq(2);

    expect(novuEmailIntegrationProduction.length).to.eq(1);
    expect(novuSmsIntegrationProduction.length).to.eq(1);
    expect(novuEmailIntegrationDevelopment.length).to.eq(1);
    expect(novuSmsIntegrationDevelopment.length).to.eq(1);

    expect(novuEmailIntegrationProduction[0].primary).to.eq(true);
    expect(novuSmsIntegrationProduction[0].primary).to.eq(true);
    expect(novuEmailIntegrationDevelopment[0].primary).to.eq(true);
    expect(novuSmsIntegrationDevelopment[0].primary).to.eq(true);
  });

  it('when Novu SMS credentials are not set it should not create Novu SMS integration', async () => {
    const oldNovuSmsIntegrationAccountSid = process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID;
    process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID = '';

    // same user creating new org
    await session.updateEETokenClaims({
      _id: clerkUser.id,
      org_id: 'clerk_org_2',
      externalId: clerkUser.externalId!,
      externalOrgId: undefined,
    });

    const { body } = await getRequest({
      domain: 'example2.com',
    }).expect(201);

    internalOrganization = body.data;

    const integrations = await integrationRepository.find({ _organizationId: internalOrganization._id });
    const environments = await environmentRepository.find({ _organizationId: internalOrganization._id });
    const productionEnv = environments.find((e) => e.name === 'Production');
    const developmentEnv = environments.find((e) => e.name === 'Development');
    const novuEmailIntegrations = integrations.filter(
      (i) => i.active && i.name === 'Novu Email' && i.providerId === EmailProviderIdEnum.Novu
    );

    expect(integrations.length).to.eq(2);
    expect(novuEmailIntegrations?.length).to.eq(2);
    expect(novuEmailIntegrations.filter((el) => el._environmentId === productionEnv?._id).length).to.eq(1);
    expect(novuEmailIntegrations.filter((el) => el._environmentId === developmentEnv?._id).length).to.eq(1);
    process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID = oldNovuSmsIntegrationAccountSid;
  });
});
