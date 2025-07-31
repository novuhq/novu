import { Test } from '@nestjs/testing';
import {
  AnalyticsService,
  createNestLoggingModuleOptions,
  FeatureFlagsService,
  LoggerModule,
  PinoLogger,
} from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  CommunityUserRepository,
  OrganizationRepository,
  UserRepository,
} from '@novu/dal';
import { ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';
import { CLERK_ORGANIZATION_1, CLERK_USER_1, ClerkClientMock } from '@novu/testing';
import { expect } from 'chai';
import mongoose from 'mongoose';
import sinon from 'sinon';
import { CreateEnvironmentCommand } from '../../environments-v1/usecases/create-environment/create-environment.command';
import { CreateEnvironment } from '../../environments-v1/usecases/create-environment/create-environment.usecase';
import { CreateNovuIntegrationsCommand } from '../../integrations/usecases/create-novu-integrations/create-novu-integrations.command';
import { CreateNovuIntegrations } from '../../integrations/usecases/create-novu-integrations/create-novu-integrations.usecase';
import { UpsertLayout } from '../../layouts-v2/usecases/upsert-layout';
import { SyncExternalOrganization } from '../../organization/usecases/create-organization/sync-external-organization/sync-external-organization.usecase';
import { GetOrganization } from '../../organization/usecases/get-organization/get-organization.usecase';

describe('Link external and internal entities #novu-v2', () => {
  let eeAuth: any;

  try {
    eeAuth = require('@novu/ee-auth');
  } catch (error) {
    return;
  }

  const { LinkEntitiesService, ClerkJwtPayload, SyncExternalUser, EEUserRepository, EEOrganizationRepository } = eeAuth;

  // Test suite variables
  let linkEntitiesService: typeof LinkEntitiesService;
  let communityUserRepository: CommunityUserRepository;
  let communityOrganizationRepository: CommunityOrganizationRepository;

  // Mock services
  const createEnvironment = {
    execute: sinon.stub().resolves({ _id: new mongoose.Types.ObjectId() }),
  };

  const createNovuIntegrations = {
    execute: sinon.stub().resolves({ _id: new mongoose.Types.ObjectId() }),
  };

  const upsertLayout = {
    execute: sinon.stub().resolves({
      _id: new mongoose.Types.ObjectId(),
      layoutId: 'layout-id',
      slug: 'layout-slug',
      name: 'layout-name',
      isDefault: true,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      origin: ResourceOriginEnum.NOVU_CLOUD,
      type: ResourceTypeEnum.BRIDGE,
      variables: {},
      controls: {},
    }),
  };

  const featureFlagsService = {
    getFlag: sinon.stub().resolves({ value: true }),
  };

  const analyticsService = {
    upsertUser: sinon.stub(),
    track: sinon.stub(),
    upsertGroup: sinon.stub(),
  };

  // Stub command creation
  sinon.stub(CreateEnvironmentCommand, 'create').returns({});
  sinon.stub(CreateNovuIntegrationsCommand, 'create').returns({});

  // Initialize repositories
  const clerkClientMock = new ClerkClientMock();
  const eeUserRepository = new EEUserRepository(new CommunityUserRepository(), clerkClientMock);
  const eeOrganizationRepository = new EEOrganizationRepository(new CommunityOrganizationRepository(), clerkClientMock);

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LoggerModule.forRoot(createNestLoggingModuleOptions({ serviceName: 'test', version: '0.0.1' }))],
      providers: [
        LinkEntitiesService,
        CommunityUserRepository,
        CommunityOrganizationRepository,
        SyncExternalUser,
        GetOrganization,
        { provide: 'SyncOrganizationUsecase', useClass: SyncExternalOrganization },
        { provide: EEUserRepository, useValue: eeUserRepository },
        { provide: UserRepository, useValue: eeUserRepository },
        { provide: OrganizationRepository, useValue: eeOrganizationRepository },
        { provide: CreateEnvironment, useValue: createEnvironment },
        { provide: CreateNovuIntegrations, useValue: createNovuIntegrations },
        { provide: UpsertLayout, useValue: upsertLayout },
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: FeatureFlagsService, useValue: featureFlagsService },
      ],
    }).compile();

    linkEntitiesService = moduleRef.get<typeof LinkEntitiesService>(LinkEntitiesService);
    communityUserRepository = moduleRef.get<CommunityUserRepository>(CommunityUserRepository);
    communityOrganizationRepository = moduleRef.get<CommunityOrganizationRepository>(CommunityOrganizationRepository);
  });

  afterEach(async () => {
    await communityUserRepository.delete({ externalId: CLERK_USER_1.id });
    await communityOrganizationRepository.delete({ externalId: CLERK_ORGANIZATION_1.id });
  });

  it.skip('should create new user and organization when no internal entities exist', async () => {
    const mockClerkPayload: Partial<typeof ClerkJwtPayload> = {
      _id: CLERK_USER_1.id,
      email: CLERK_USER_1.primaryEmailAddress?.emailAddress || '',
      lastName: CLERK_USER_1.lastName || '',
      firstName: CLERK_USER_1.firstName || '',
      profilePicture: CLERK_USER_1.imageUrl,
      org_id: CLERK_ORGANIZATION_1.id,
      externalId: undefined,
      externalOrgId: undefined,
    };

    const result = await linkEntitiesService.linkInternalExternalEntities({}, mockClerkPayload);

    expect(result.internalUserId).to.be.a('string');
    expect(result.internalOrgId).to.be.a('string');

    const internalUser = await eeUserRepository.findById(result.internalUserId);
    expect(internalUser?.externalId).to.equal(CLERK_USER_1.id);

    const internalOrg = await eeOrganizationRepository.findById(result.internalOrgId);
    expect(internalOrg?.externalId).to.equal(CLERK_ORGANIZATION_1.id);

    sinon.assert.calledTwice(createEnvironment.execute);
    sinon.assert.calledTwice(createNovuIntegrations.execute);
  });

  it('should update JWT if internal linked entities exist but not present in JWT', async () => {
    const existingInternalUser = await communityUserRepository.create({
      externalId: CLERK_USER_1.id,
    });
    const existingInternalOrg = await communityOrganizationRepository.create({
      externalId: CLERK_ORGANIZATION_1.id,
    });

    const mockClerkPayload: Partial<typeof ClerkJwtPayload> = {
      _id: CLERK_USER_1.id,
      email: CLERK_USER_1.primaryEmailAddress?.emailAddress || '',
      lastName: CLERK_USER_1.lastName || '',
      firstName: CLERK_USER_1.firstName || '',
      profilePicture: CLERK_USER_1.imageUrl,
      org_id: CLERK_ORGANIZATION_1.id,
      externalId: undefined,
      externalOrgId: undefined,
    };

    const result = await linkEntitiesService.linkInternalExternalEntities({}, mockClerkPayload);

    expect(result.internalUserId).to.equal(existingInternalUser._id);
    expect(result.internalOrgId).to.equal(existingInternalOrg._id);
  });

  it('should do no-op if entities are already linked', async () => {
    const existingInternalUser = await communityUserRepository.create({
      externalId: CLERK_USER_1.id,
    });
    const existingInternalOrg = await communityOrganizationRepository.create({
      externalId: CLERK_ORGANIZATION_1.id,
    });

    const createUserSpy = sinon.spy(communityUserRepository, 'create');
    const createOrganizationSpy = sinon.spy(communityOrganizationRepository, 'create');

    const mockClerkPayload: Partial<typeof ClerkJwtPayload> = {
      _id: CLERK_USER_1.id,
      email: CLERK_USER_1.primaryEmailAddress?.emailAddress || '',
      lastName: CLERK_USER_1.lastName || '',
      firstName: CLERK_USER_1.firstName || '',
      profilePicture: CLERK_USER_1.imageUrl,
      org_id: CLERK_ORGANIZATION_1.id,
      externalId: existingInternalUser._id,
      externalOrgId: existingInternalOrg._id,
    };

    const result = await linkEntitiesService.linkInternalExternalEntities({}, mockClerkPayload);

    expect(result.internalUserId).to.equal(existingInternalUser._id);
    expect(result.internalOrgId).to.equal(existingInternalOrg._id);

    sinon.assert.notCalled(createUserSpy);
    sinon.assert.notCalled(createOrganizationSpy);
  });

  it('should fail if external entities are not found', async () => {
    const mockClerkPayload: Partial<typeof ClerkJwtPayload> = {
      _id: 'non-existent-external-id',
      email: CLERK_USER_1.primaryEmailAddress?.emailAddress || '',
      lastName: CLERK_USER_1.lastName || '',
      firstName: CLERK_USER_1.firstName || '',
      profilePicture: CLERK_USER_1.imageUrl,
      org_id: 'non-existent-external-org-id',
      externalId: undefined,
      externalOrgId: undefined,
    };

    try {
      await linkEntitiesService.linkInternalExternalEntities({}, mockClerkPayload);
      throw new Error('Expected error to be thrown');
    } catch (error) {
      expect(error).to.be.an('error');
    }
  });
});
