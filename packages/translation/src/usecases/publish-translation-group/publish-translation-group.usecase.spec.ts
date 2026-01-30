import { Test, TestingModule } from '@nestjs/testing';
import {
  LocalizationGroupRepository,
  LocalizationRepository,
  LocalizationResourceEnum as DalLocalizationResourceEnum,
} from '@novu/dal';

import { PublishTranslationGroup, PublishTranslationGroupResult } from './publish-translation-group.usecase';
import { PublishTranslationGroupCommand, LocalizationResourceEnum } from './publish-translation-group.command';

describe('PublishTranslationGroup Usecase', () => {
  let usecase: PublishTranslationGroup;
  let localizationGroupRepository: jest.Mocked<LocalizationGroupRepository>;
  let localizationRepository: jest.Mocked<LocalizationRepository>;

  const mockOrganizationId = '60d5ec9f1c9d440000org001';
  const mockSourceEnvironmentId = '60d5ec9f1c9d440000env001';
  const mockTargetEnvironmentId = '60d5ec9f1c9d440000env002';
  const mockUserId = '60d5ec9f1c9d440000user01';
  const mockResourceId = 'test-workflow';
  const mockResourceInternalId = '60d5ec9f1c9d440000res001';
  const mockTargetResourceInternalId = '60d5ec9f1c9d440000res002';
  const mockSourceGroupId = '60d5ec9f1c9d440000grp001';
  const mockTargetGroupId = '60d5ec9f1c9d440000grp002';

  const mockSourceGroup = {
    _id: mockSourceGroupId,
    resourceType: DalLocalizationResourceEnum.WORKFLOW,
    resourceId: mockResourceId,
    resourceName: 'Test Workflow',
    _resourceInternalId: mockResourceInternalId,
    _environmentId: mockSourceEnvironmentId,
    _organizationId: mockOrganizationId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTargetGroup = {
    _id: mockTargetGroupId,
    resourceType: DalLocalizationResourceEnum.WORKFLOW,
    resourceId: mockResourceId,
    resourceName: 'Test Workflow',
    _resourceInternalId: mockTargetResourceInternalId,
    _environmentId: mockTargetEnvironmentId,
    _organizationId: mockOrganizationId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockSourceLocalizations = [
    {
      _id: '60d5ec9f1c9d440000loc001',
      locale: 'es_ES',
      content: JSON.stringify({ 'step.email.subject': 'Bienvenido' }),
      _localizationGroupId: mockSourceGroupId,
      _environmentId: mockSourceEnvironmentId,
      _organizationId: mockOrganizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: '60d5ec9f1c9d440000loc002',
      locale: 'fr_FR',
      content: JSON.stringify({ 'step.email.subject': 'Bienvenue' }),
      _localizationGroupId: mockSourceGroupId,
      _environmentId: mockSourceEnvironmentId,
      _organizationId: mockOrganizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    const mockLocalizationGroupRepo = {
      findByResource: jest.fn(),
      getOrCreateForResource: jest.fn(),
    };

    const mockLocalizationRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PublishTranslationGroup,
        {
          provide: LocalizationGroupRepository,
          useValue: mockLocalizationGroupRepo,
        },
        {
          provide: LocalizationRepository,
          useValue: mockLocalizationRepo,
        },
      ],
    }).compile();

    usecase = moduleRef.get<PublishTranslationGroup>(PublishTranslationGroup);
    localizationGroupRepository = moduleRef.get(LocalizationGroupRepository);
    localizationRepository = moduleRef.get(LocalizationRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publish translations to new environment', () => {
    it('should copy all localizations to target environment', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(mockSourceGroup);
      localizationGroupRepository.getOrCreateForResource.mockResolvedValue(mockTargetGroup);
      localizationRepository.find.mockResolvedValue(mockSourceLocalizations);
      localizationRepository.findOne.mockResolvedValue(null); // No existing target localizations
      localizationRepository.create.mockResolvedValue({} as any);

      const command = PublishTranslationGroupCommand.create({
        user: {
          _id: mockUserId,
          organizationId: mockOrganizationId,
          environmentId: mockSourceEnvironmentId,
        },
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceName: 'Test Workflow',
        resourceType: LocalizationResourceEnum.WORKFLOW,
        sourceEnvironmentId: mockSourceEnvironmentId,
        targetEnvironmentId: mockTargetEnvironmentId,
        targetResourceInternalId: mockTargetResourceInternalId,
      });

      // Act
      const result = await usecase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.copiedLocalizations).toBe(2);
      expect(result.publishedGroup).toEqual(mockTargetGroup);
      expect(localizationRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should update existing localizations in target environment', async () => {
      // Arrange
      const existingTargetLocalization = {
        _id: '60d5ec9f1c9d440000loc003',
        locale: 'es_ES',
        content: JSON.stringify({ 'step.email.subject': 'Old content' }),
        _localizationGroupId: mockTargetGroupId,
        _environmentId: mockTargetEnvironmentId,
        _organizationId: mockOrganizationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localizationGroupRepository.findByResource.mockResolvedValue(mockSourceGroup);
      localizationGroupRepository.getOrCreateForResource.mockResolvedValue(mockTargetGroup);
      localizationRepository.find.mockResolvedValue(mockSourceLocalizations);
      localizationRepository.findOne
        .mockResolvedValueOnce(existingTargetLocalization) // es_ES exists
        .mockResolvedValueOnce(null); // fr_FR doesn't exist
      localizationRepository.update.mockResolvedValue({ matched: 1, modified: 1 });
      localizationRepository.create.mockResolvedValue({} as any);

      const command = PublishTranslationGroupCommand.create({
        user: {
          _id: mockUserId,
          organizationId: mockOrganizationId,
          environmentId: mockSourceEnvironmentId,
        },
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        sourceEnvironmentId: mockSourceEnvironmentId,
        targetEnvironmentId: mockTargetEnvironmentId,
        targetResourceInternalId: mockTargetResourceInternalId,
      });

      // Act
      const result = await usecase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.copiedLocalizations).toBe(2);
      expect(localizationRepository.update).toHaveBeenCalledTimes(1);
      expect(localizationRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('publish with no source translations', () => {
    it('should return success with zero copied localizations', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(mockSourceGroup);
      localizationGroupRepository.getOrCreateForResource.mockResolvedValue(mockTargetGroup);
      localizationRepository.find.mockResolvedValue([]);

      const command = PublishTranslationGroupCommand.create({
        user: {
          _id: mockUserId,
          organizationId: mockOrganizationId,
          environmentId: mockSourceEnvironmentId,
        },
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        sourceEnvironmentId: mockSourceEnvironmentId,
        targetEnvironmentId: mockTargetEnvironmentId,
        targetResourceInternalId: mockTargetResourceInternalId,
      });

      // Act
      const result = await usecase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.copiedLocalizations).toBe(0);
      expect(result.publishedGroup).toEqual(mockTargetGroup);
      expect(result.message).toContain('no localizations to copy');
    });
  });

  describe('publish with no source group', () => {
    it('should return success when source group does not exist', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(null);

      const command = PublishTranslationGroupCommand.create({
        user: {
          _id: mockUserId,
          organizationId: mockOrganizationId,
          environmentId: mockSourceEnvironmentId,
        },
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        sourceEnvironmentId: mockSourceEnvironmentId,
        targetEnvironmentId: mockTargetEnvironmentId,
        targetResourceInternalId: mockTargetResourceInternalId,
      });

      // Act
      const result = await usecase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.copiedLocalizations).toBe(0);
      expect(result.publishedGroup).toBeUndefined();
      expect(result.message).toContain('No translations to publish');
    });
  });

  describe('error handling', () => {
    it('should throw error when targetResourceInternalId is not provided', async () => {
      // Arrange
      const command = PublishTranslationGroupCommand.create({
        user: {
          _id: mockUserId,
          organizationId: mockOrganizationId,
          environmentId: mockSourceEnvironmentId,
        },
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        sourceEnvironmentId: mockSourceEnvironmentId,
        targetEnvironmentId: mockTargetEnvironmentId,
        // targetResourceInternalId not provided
      });

      // Act & Assert
      await expect(usecase.execute(command)).rejects.toThrow(
        'targetResourceInternalId is required for publishing translations'
      );
    });

    it('should throw error when target group creation fails', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(mockSourceGroup);
      localizationGroupRepository.getOrCreateForResource.mockResolvedValue(null);

      const command = PublishTranslationGroupCommand.create({
        user: {
          _id: mockUserId,
          organizationId: mockOrganizationId,
          environmentId: mockSourceEnvironmentId,
        },
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        sourceEnvironmentId: mockSourceEnvironmentId,
        targetEnvironmentId: mockTargetEnvironmentId,
        targetResourceInternalId: mockTargetResourceInternalId,
      });

      // Act & Assert
      await expect(usecase.execute(command)).rejects.toThrow(
        'Failed to create target LocalizationGroup'
      );
    });
  });

  describe('session support', () => {
    it('should pass session to repositories when provided', async () => {
      // Arrange
      const mockSession = {} as any;
      localizationGroupRepository.findByResource.mockResolvedValue(mockSourceGroup);
      localizationGroupRepository.getOrCreateForResource.mockResolvedValue(mockTargetGroup);
      localizationRepository.find.mockResolvedValue(mockSourceLocalizations);
      localizationRepository.findOne.mockResolvedValue(null);
      localizationRepository.create.mockResolvedValue({} as any);

      const command = PublishTranslationGroupCommand.create({
        user: {
          _id: mockUserId,
          organizationId: mockOrganizationId,
          environmentId: mockSourceEnvironmentId,
        },
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        sourceEnvironmentId: mockSourceEnvironmentId,
        targetEnvironmentId: mockTargetEnvironmentId,
        targetResourceInternalId: mockTargetResourceInternalId,
        session: mockSession,
      });

      // Act
      await usecase.execute(command);

      // Assert
      expect(localizationGroupRepository.getOrCreateForResource).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        mockTargetResourceInternalId,
        mockTargetEnvironmentId,
        mockOrganizationId,
        mockSession
      );
    });
  });
});
