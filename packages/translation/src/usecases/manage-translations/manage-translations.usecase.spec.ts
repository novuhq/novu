import { Test, TestingModule } from '@nestjs/testing';
import { LocalizationGroupRepository, LocalizationResourceEnum as DalLocalizationResourceEnum } from '@novu/dal';

import { ManageTranslations, ManageTranslationsResult } from './manage-translations.usecase';
import { ManageTranslationsCommand, LocalizationResourceEnum } from './manage-translations.command';

describe('ManageTranslations Usecase', () => {
  let usecase: ManageTranslations;
  let localizationGroupRepository: jest.Mocked<LocalizationGroupRepository>;

  const mockOrganizationId = '60d5ec9f1c9d440000org001';
  const mockEnvironmentId = '60d5ec9f1c9d440000env001';
  const mockUserId = '60d5ec9f1c9d440000user01';
  const mockResourceId = 'test-workflow';
  const mockResourceInternalId = '60d5ec9f1c9d440000res001';
  const mockResourceName = 'Test Workflow';

  const mockLocalizationGroup = {
    _id: '60d5ec9f1c9d440000grp001',
    resourceType: DalLocalizationResourceEnum.WORKFLOW,
    resourceId: mockResourceId,
    resourceName: mockResourceName,
    _resourceInternalId: mockResourceInternalId,
    _environmentId: mockEnvironmentId,
    _organizationId: mockOrganizationId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockLocalizationGroupRepo = {
      findByResource: jest.fn(),
      getOrCreateForResource: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ManageTranslations,
        {
          provide: LocalizationGroupRepository,
          useValue: mockLocalizationGroupRepo,
        },
      ],
    }).compile();

    usecase = moduleRef.get<ManageTranslations>(ManageTranslations);
    localizationGroupRepository = moduleRef.get(LocalizationGroupRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('enable translations', () => {
    it('should create a new LocalizationGroup when enabling translations for the first time', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(null);
      localizationGroupRepository.getOrCreateForResource.mockResolvedValue(mockLocalizationGroup);

      const command = ManageTranslationsCommand.create({
        enabled: true,
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceName: mockResourceName,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId: mockOrganizationId,
        environmentId: mockEnvironmentId,
        userId: mockUserId,
      });

      // Act
      const result = await usecase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.enabled).toBe(true);
      expect(result.shouldAutoTranslate).toBe(true);
      expect(result.localizationGroup).toEqual(mockLocalizationGroup);
      expect(localizationGroupRepository.getOrCreateForResource).toHaveBeenCalledWith(
        DalLocalizationResourceEnum.WORKFLOW,
        mockResourceId,
        mockResourceName,
        mockResourceInternalId,
        mockEnvironmentId,
        mockOrganizationId,
        undefined
      );
    });

    it('should re-enable translations without auto-translate when group already exists', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(mockLocalizationGroup);

      const command = ManageTranslationsCommand.create({
        enabled: true,
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceName: mockResourceName,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId: mockOrganizationId,
        environmentId: mockEnvironmentId,
        userId: mockUserId,
      });

      // Act
      const result = await usecase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.enabled).toBe(true);
      expect(result.shouldAutoTranslate).toBe(false);
      expect(result.localizationGroup).toEqual(mockLocalizationGroup);
      expect(localizationGroupRepository.getOrCreateForResource).not.toHaveBeenCalled();
    });

    it('should throw error when enabling without resourceInternalId', async () => {
      // Arrange
      const command = ManageTranslationsCommand.create({
        enabled: true,
        resourceId: mockResourceId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId: mockOrganizationId,
        environmentId: mockEnvironmentId,
        userId: mockUserId,
      });

      // Act & Assert
      await expect(usecase.execute(command)).rejects.toThrow(
        'resourceInternalId is required when enabling translations'
      );
    });

    it('should use resourceId as name when resourceName not provided', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(null);
      localizationGroupRepository.getOrCreateForResource.mockResolvedValue(mockLocalizationGroup);

      const command = ManageTranslationsCommand.create({
        enabled: true,
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        // resourceName not provided
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId: mockOrganizationId,
        environmentId: mockEnvironmentId,
        userId: mockUserId,
      });

      // Act
      await usecase.execute(command);

      // Assert
      expect(localizationGroupRepository.getOrCreateForResource).toHaveBeenCalledWith(
        DalLocalizationResourceEnum.WORKFLOW,
        mockResourceId,
        mockResourceId, // Falls back to resourceId
        mockResourceInternalId,
        mockEnvironmentId,
        mockOrganizationId,
        undefined
      );
    });
  });

  describe('disable translations', () => {
    it('should soft-disable translations when group exists', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(mockLocalizationGroup);

      const command = ManageTranslationsCommand.create({
        enabled: false,
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId: mockOrganizationId,
        environmentId: mockEnvironmentId,
        userId: mockUserId,
      });

      // Act
      const result = await usecase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.enabled).toBe(false);
      expect(result.shouldAutoTranslate).toBe(false);
      expect(result.localizationGroup).toEqual(mockLocalizationGroup);
      expect(result.message).toContain('data preserved');
    });

    it('should return success when disabling translations that are already disabled', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(null);

      const command = ManageTranslationsCommand.create({
        enabled: false,
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId: mockOrganizationId,
        environmentId: mockEnvironmentId,
        userId: mockUserId,
      });

      // Act
      const result = await usecase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(result.enabled).toBe(false);
      expect(result.shouldAutoTranslate).toBe(false);
      expect(result.localizationGroup).toBeUndefined();
      expect(result.message).toContain('already disabled');
    });
  });

  describe('resource type conversion', () => {
    it('should handle LAYOUT resource type', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(null);
      localizationGroupRepository.getOrCreateForResource.mockResolvedValue({
        ...mockLocalizationGroup,
        resourceType: DalLocalizationResourceEnum.LAYOUT,
      });

      const command = ManageTranslationsCommand.create({
        enabled: true,
        resourceId: 'test-layout',
        resourceInternalId: mockResourceInternalId,
        resourceName: 'Test Layout',
        resourceType: LocalizationResourceEnum.LAYOUT,
        organizationId: mockOrganizationId,
        environmentId: mockEnvironmentId,
        userId: mockUserId,
      });

      // Act
      const result = await usecase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(localizationGroupRepository.getOrCreateForResource).toHaveBeenCalledWith(
        DalLocalizationResourceEnum.LAYOUT,
        'test-layout',
        'Test Layout',
        mockResourceInternalId,
        mockEnvironmentId,
        mockOrganizationId,
        undefined
      );
    });
  });

  describe('session support', () => {
    it('should pass session to repository when provided', async () => {
      // Arrange
      const mockSession = {} as any;
      localizationGroupRepository.findByResource.mockResolvedValue(null);
      localizationGroupRepository.getOrCreateForResource.mockResolvedValue(mockLocalizationGroup);

      const command = ManageTranslationsCommand.create({
        enabled: true,
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceName: mockResourceName,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId: mockOrganizationId,
        environmentId: mockEnvironmentId,
        userId: mockUserId,
        session: mockSession,
      });

      // Act
      await usecase.execute(command);

      // Assert
      expect(localizationGroupRepository.getOrCreateForResource).toHaveBeenCalledWith(
        DalLocalizationResourceEnum.WORKFLOW,
        mockResourceId,
        mockResourceName,
        mockResourceInternalId,
        mockEnvironmentId,
        mockOrganizationId,
        mockSession
      );
    });
  });
});
