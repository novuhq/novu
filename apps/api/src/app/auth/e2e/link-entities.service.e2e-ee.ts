import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import {
  CommunityUserRepository,
  CommunityOrganizationRepository,
  UserRepository,
  OrganizationRepository,
} from '@novu/dal';
import sinon from 'sinon';
import { LinkEntitiesService, ClerkJwtPayload, SyncExternalUser, EEUserRepository } from '@novu/ee-auth';
import { CLERK_ORGANIZATION_1, CLERK_USER_1, getEERepository } from '@novu/testing';
import mongoose from 'mongoose';
import { SharedModule } from '../../shared/shared.module';
import { GetOrganization } from '../../organization/usecases/get-organization/get-organization.usecase';
import { SyncExternalOrganization } from '../../organization/usecases/create-organization/sync-external-organization/sync-external-organization.usecase';
import { CreateEnvironment } from '../../environments-v1/usecases/create-environment/create-environment.usecase';
import { CreateNovuIntegrations } from '../../integrations/usecases/create-novu-integrations/create-novu-integrations.usecase';
import { CreateNovuIntegrationsCommand } from '../../integrations/usecases/create-novu-integrations/create-novu-integrations.command';
import { CreateEnvironmentCommand } from '../../environments-v1/usecases/create-environment/create-environment.command';

describe('Link external and internal entities #novu-v2', () => {
  let linkEntitiesService: LinkEntitiesService;
  let communityUserRepository: CommunityUserRepository;
  let communityOrganizationRepository: CommunityOrganizationRepository;

  const createEnvironment = {
    execute: sinon.stub().resolves({ _id: new mongoose.Types.ObjectId() }),
  };
  const createNovuIntegrations = {
    execute: sinon.stub().resolves({ _id: new mongoose.Types.ObjectId() }),
  };

  sinon.stub(CreateEnvironmentCommand, 'create').returns({});
  sinon.stub(CreateNovuIntegrationsCommand, 'create').returns({});

  const eeUserRepository = getEERepository<UserRepository>('UserRepository');
  const eeOrganizationRepository = getEERepository<OrganizationRepository>('OrganizationRepository');

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule],
      providers: [
        LinkEntitiesService,
        SyncExternalUser,
        { provide: 'SyncOrganizationUsecase', useClass: SyncExternalOrganization },
        GetOrganization,
        SyncExternalOrganization,
        { provide: CreateEnvironment, useValue: createEnvironment },
        { provide: CreateNovuIntegrations, useValue: createNovuIntegrations },
        { provide: EEUserRepository, useValue: eeUserRepository },
        { provide: OrganizationRepository, useValue: eeOrganizationRepository },
        { provide: UserRepository, useValue: eeUserRepository },
      ],
    }).compile();

    linkEntitiesService = moduleRef.get<LinkEntitiesService>(LinkEntitiesService);

    communityUserRepository = moduleRef.get<CommunityUserRepository>(CommunityUserRepository);
    communityOrganizationRepository = moduleRef.get<CommunityOrganizationRepository>(CommunityOrganizationRepository);
  });

  afterEach(async () => {
    // cleanup internal entities
    await communityUserRepository.delete({ externalId: CLERK_USER_1.id });
    await communityOrganizationRepository.delete({ externalId: CLERK_ORGANIZATION_1.id });
  });

  it('should create new user and organization when no internal entities exist', async () => {
    const mockClerkPayload: Partial<ClerkJwtPayload> = {
      _id: CLERK_USER_1.id,
      email: CLERK_USER_1.primaryEmailAddress?.emailAddress || '',
      lastName: CLERK_USER_1.lastName || '',
      firstName: CLERK_USER_1.firstName || '',
      profilePicture: CLERK_USER_1.imageUrl,
      org_id: CLERK_ORGANIZATION_1.id,
      externalId: undefined, // not linked yet
      externalOrgId: undefined, // not linked yet
    };

    const result = await linkEntitiesService.linkInternalExternalEntities({} as any, mockClerkPayload as any);

    expect(result.internalUserId).to.be.a('string');
    expect(result.internalOrgId).to.be.a('string');

    // newly created internal user 'externalId' should match CLERK_USER_1.id
    const internalUser = await eeUserRepository.findById(result.internalUserId);
    expect(internalUser?.externalId).to.equal(CLERK_USER_1.id);

    // newly created internal org 'externalId' should match CLERK_ORGANIZATION_1.id
    const internalOrg = await eeOrganizationRepository.findById(result.internalOrgId);
    expect(internalOrg?.externalId).to.equal(CLERK_ORGANIZATION_1.id);

    // verify basic organization creation side-effects
    sinon.assert.calledTwice(createEnvironment.execute);
    sinon.assert.calledTwice(createNovuIntegrations.execute);
  });

  it('should update JWT if internal linked entities exist but not present in JWT', async () => {
    // create internal user and organization to simulate existing entities
    const existingInternalUser = await communityUserRepository.create({
      externalId: CLERK_USER_1.id,
    });
    const existingInternalOrg = await communityOrganizationRepository.create({
      externalId: CLERK_ORGANIZATION_1.id,
    });

    // entities exist internally but not present in JWT yet
    const mockClerkPayload: Partial<ClerkJwtPayload> = {
      _id: CLERK_USER_1.id,
      email: CLERK_USER_1.primaryEmailAddress?.emailAddress || '',
      lastName: CLERK_USER_1.lastName || '',
      firstName: CLERK_USER_1.firstName || '',
      profilePicture: CLERK_USER_1.imageUrl,
      org_id: CLERK_ORGANIZATION_1.id,
      externalId: undefined,
      externalOrgId: undefined,
    };

    const result = await linkEntitiesService.linkInternalExternalEntities({} as any, mockClerkPayload as any);

    expect(result.internalUserId).to.equal(existingInternalUser._id);
    expect(result.internalOrgId).to.equal(existingInternalOrg._id);
  });

  it('should do no-op if entities are already linked', async () => {
    // create internal user and organization to simulate existing entities
    const existingInternalUser = await communityUserRepository.create({
      externalId: CLERK_USER_1.id,
    });
    const existingInternalOrg = await communityOrganizationRepository.create({
      externalId: CLERK_ORGANIZATION_1.id,
    });

    const createUserSpy = sinon.spy(communityUserRepository, 'create');
    const createOrganizationSpy = sinon.spy(communityOrganizationRepository, 'create');

    const mockClerkPayload: Partial<ClerkJwtPayload> = {
      _id: CLERK_USER_1.id,
      email: CLERK_USER_1.primaryEmailAddress?.emailAddress || '',
      lastName: CLERK_USER_1.lastName || '',
      firstName: CLERK_USER_1.firstName || '',
      profilePicture: CLERK_USER_1.imageUrl,
      org_id: CLERK_ORGANIZATION_1.id,
      externalId: existingInternalUser._id, // already linked
      externalOrgId: existingInternalOrg._id, // already linked
    };

    const result = await linkEntitiesService.linkInternalExternalEntities({} as any, mockClerkPayload as any);

    expect(result.internalUserId).to.equal(existingInternalUser._id);
    expect(result.internalOrgId).to.equal(existingInternalOrg._id);

    // no update action on internal entities needed
    sinon.assert.notCalled(createUserSpy);
    sinon.assert.notCalled(createOrganizationSpy);
  });

  it('should fail if external entities are not found', async () => {
    // JWT for which external entities do not exist anymore
    const mockClerkPayload: Partial<ClerkJwtPayload> = {
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
      await linkEntitiesService.linkInternalExternalEntities({} as any, mockClerkPayload as any);
      throw new Error('Expected error to be thrown');
    } catch (error) {
      expect(error).to.be.an('error');
    }
  });
});
