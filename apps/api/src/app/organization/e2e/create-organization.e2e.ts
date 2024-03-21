import { expect } from 'chai';

import {
  MemberRepository,
  OrganizationRepository,
  UserRepository,
  IntegrationRepository,
  EnvironmentRepository,
} from '@novu/dal';
import { UserSession } from '@novu/testing';
import {
  ApiServiceLevelEnum,
  EmailProviderIdEnum,
  ICreateOrganizationDto,
  JobTitleEnum,
  MemberRoleEnum,
  SmsProviderIdEnum,
} from '@novu/shared';

describe('Create Organization - /organizations (POST)', async () => {
  let session: UserSession;
  const organizationRepository = new OrganizationRepository();
  const userRepository = new UserRepository();
  const memberRepository = new MemberRepository();
  const integrationRepository = new IntegrationRepository();
  const environmentRepository = new EnvironmentRepository();

  before(async () => {
    session = new UserSession();
    await session.initialize({
      noOrganization: true,
    });
  });

  describe('Valid Creation', () => {
    it('should add the user as admin', async () => {
      const { body } = await session.testAgent
        .post('/v1/organizations')
        .send({
          name: 'Test Org 2',
        })
        .expect(201);
      const dbOrganization = await organizationRepository.findById(body.data._id);

      const members = await memberRepository.getOrganizationMembers(dbOrganization?._id as string);

      expect(members.length).to.eq(1);
      expect(members[0]._userId).to.eq(session.user._id);
      expect(members[0].roles[0]).to.eq(MemberRoleEnum.ADMIN);
    });

    it('should create organization with correct name', async () => {
      const demoOrganization = {
        name: 'Hello Org',
      };
      const { body } = await session.testAgent.post('/v1/organizations').send(demoOrganization).expect(201);

      expect(body.data.name).to.eq(demoOrganization.name);
    });

    it('should not create organization with no name', async () => {
      await session.testAgent.post('/v1/organizations').send({}).expect(400);
    });

    it('should create organization with apiServiceLevel of free by default', async () => {
      const testOrganization = {
        name: 'Free Org',
      };

      const { body } = await session.testAgent.post('/v1/organizations').send(testOrganization).expect(201);
      const dbOrganization = await organizationRepository.findById(body.data._id);

      expect(dbOrganization?.apiServiceLevel).to.eq(ApiServiceLevelEnum.FREE);
    });

    it('should create organization with questionnaire data', async () => {
      const testOrganization: ICreateOrganizationDto = {
        name: 'Org Name',
        productUseCases: {
          in_app: true,
          multi_channel: true,
        },
        domain: 'org.com',
      };

      const { body } = await session.testAgent.post('/v1/organizations').send(testOrganization).expect(201);
      const dbOrganization = await organizationRepository.findById(body.data._id);

      expect(dbOrganization?.name).to.eq(testOrganization.name);
      expect(dbOrganization?.domain).to.eq(testOrganization.domain);
      expect(dbOrganization?.productUseCases?.in_app).to.eq(testOrganization.productUseCases?.in_app);
      expect(dbOrganization?.productUseCases?.multi_channel).to.eq(testOrganization.productUseCases?.multi_channel);
    });

    it('should update user job title on organization creation', async () => {
      const testOrganization: ICreateOrganizationDto = {
        name: 'Org Name',
        jobTitle: JobTitleEnum.PRODUCT_MANAGER,
      };

      await session.testAgent.post('/v1/organizations').send(testOrganization).expect(201);
      const user = await userRepository.findById(session.user._id);

      expect(user?.jobTitle).to.eq(testOrganization.jobTitle);
    });

    it('should create organization with built in Novu integrations and set them as primary', async () => {
      const testOrganization: ICreateOrganizationDto = {
        name: 'Org Name',
      };

      const { body } = await session.testAgent.post('/v1/organizations').send(testOrganization).expect(201);
      const integrations = await integrationRepository.find({ _organizationId: body.data._id });
      const environments = await environmentRepository.find({ _organizationId: body.data._id });
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
      const novuSmsIntegrationDevelopment = novuSmsIntegration.filter(
        (el) => el._environmentId === developmentEnv?._id
      );

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

    it('when Novu Email credentials are not set it should not create Novu Email integration', async () => {
      const oldNovuEmailIntegrationApiKey = process.env.NOVU_EMAIL_INTEGRATION_API_KEY;
      process.env.NOVU_EMAIL_INTEGRATION_API_KEY = '';
      const testOrganization: ICreateOrganizationDto = {
        name: 'Org Name',
      };

      const { body } = await session.testAgent.post('/v1/organizations').send(testOrganization).expect(201);
      const integrations = await integrationRepository.find({ _organizationId: body.data._id });
      const environments = await environmentRepository.find({ _organizationId: body.data._id });
      const productionEnv = environments.find((e) => e.name === 'Production');
      const developmentEnv = environments.find((e) => e.name === 'Development');
      const novuSmsIntegration = integrations.filter(
        (i) => i.active && i.name === 'Novu SMS' && i.providerId === SmsProviderIdEnum.Novu
      );

      expect(integrations.length).to.eq(2);
      expect(novuSmsIntegration?.length).to.eq(2);
      expect(novuSmsIntegration.filter((el) => el._environmentId === productionEnv?._id).length).to.eq(1);
      expect(novuSmsIntegration.filter((el) => el._environmentId === developmentEnv?._id).length).to.eq(1);
      process.env.NOVU_EMAIL_INTEGRATION_API_KEY = oldNovuEmailIntegrationApiKey;
    });

    it('when Novu SMS credentials are not set it should not create Novu SMS integration', async () => {
      const oldNovuSmsIntegrationAccountSid = process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID;
      process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID = '';
      const testOrganization: ICreateOrganizationDto = {
        name: 'Org Name',
      };

      const { body } = await session.testAgent.post('/v1/organizations').send(testOrganization).expect(201);
      const integrations = await integrationRepository.find({ _organizationId: body.data._id });
      const environments = await environmentRepository.find({ _organizationId: body.data._id });
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
});
