import { Test, TestingModule } from '@nestjs/testing';
import {
  LocalizationGroupRepository,
  LocalizationRepository,
  LocalizationResourceEnum as DalLocalizationResourceEnum,
} from '@novu/dal';

import { DeleteTranslationGroup, DeleteTranslationGroupResult } from './delete-translation-group.usecase';
import { DeleteTranslationGroupCommand, LocalizationResourceEnum } from './delete-translation-group.command';

describe('DeleteTranslationGroup Usecase', () => {
  let usecase: DeleteTranslationGroup;
  let localizationGroupRepository: jest.Mocked<LocalizationGroupRepository>;
  let localizationRepository: jest.Mocked<LocalizationRepository>;

  const mockOrganizationId = '60d5ec9f1c9d440000org001';
  const mockEnvironmentId = '60d5ec9f1c9d440000env001';
  const mockUserId = '60d5ec9f1c9d440000user01';
  const mockResourceId = 'test-workflow';
  const mockResourceInternalId = '60d5ec9f1c9d440000res001';
  const mockGroupId = '60d5ec9f1c9d440000grp001';

  const mockLocalizationGroup = {
    _id: mockGroupId,
    resourceType: DalLocalizationResourceEnum.WORKFLOW,
    resourceId: mockResourceId,
    resourceName: 'Test Workflow',
    _resourceInternalId: mockResourceInternalId,
    _environmentId: mockEnvironmentId,
    _organizationId: mockOrganizationId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockLocalizationGroupRepo = {
      findByResource: jest.fn(),
      delete: jest.fn(),
    };

    const mockLocalizationRepo = {
      delete: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteTranslationGroup,
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

    usecase = moduleRef.get<DeleteTranslationGroup>(DeleteTranslationGroup);
    localizationGroupRepository = moduleRef.get(LocalizationGroupRepository);
    localizationRepository = moduleRef.get(LocalizationRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('delete existing translation group', () => {
    it('should delete all localizations and the group', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(mockLocalizationGroup);
      localizationRepository.delete.mockResolvedValue({
        acknowledged: true,
        deletedCount: 5,
      });
      localizationGroupRepository.delete.mockResolvedValue({
        acknowledged: true,
        deletedCount: 1,
      });

      const command = DeleteTranslationGroupCommand.create({
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
      expect(result.deletedLocalizations).toBe(5);
      expect(result.groupDeleted).toBe(true);
      expect(localizationRepository.delete).toHaveBeenCalledWith(
        {
          _localizationGroupId: mockGroupId,
          _environmentId: mockEnvironmentId,
          _organizationId: mockOrganizationId,
        },
        { session: undefined }
      );
      expect(localizationGroupRepository.delete).toHaveBeenCalledWith(
        {
          _id: mockGroupId,
          _environmentId: mockEnvironmentId,
          _organizationId: mockOrganizationId,
        },
        { session: undefined }
      );
    });

    it('should delete group even when no localizations exist', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(mockLocalizationGroup);
      localizationRepository.delete.mockResolvedValue({
        acknowledged: true,
        deletedCount: 0,
      });
      localizationGroupRepository.delete.mockResolvedValue({
        acknowledged: true,
        deletedCount: 1,
      });

      const command = DeleteTranslationGroupCommand.create({
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
      expect(result.deletedLocalizations).toBe(0);
      expect(result.groupDeleted).toBe(true);
    });
  });

  describe('delete non-existing translation group', () => {
    it('should return success when no group exists', async () => {
      // Arrange
      localizationGroupRepository.findByResource.mockResolvedValue(null);

      const command = DeleteTranslationGroupCommand.create({
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
      expect(result.deletedLocalizations).toBe(0);
      expect(result.groupDeleted).toBe(false);
      expect(result.message).toContain('No translations found');
      expect(localizationRepository.delete).not.toHaveBeenCalled();
      expect(localizationGroupRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('resource type handling', () => {
    it('should handle LAYOUT resource type', async () => {
      // Arrange
      const layoutGroup = {
        ...mockLocalizationGroup,
        resourceType: DalLocalizationResourceEnum.LAYOUT,
        resourceId: 'test-layout',
      };
      localizationGroupRepository.findByResource.mockResolvedValue(layoutGroup);
      localizationRepository.delete.mockResolvedValue({
        acknowledged: true,
        deletedCount: 3,
      });
      localizationGroupRepository.delete.mockResolvedValue({
        acknowledged: true,
        deletedCount: 1,
      });

      const command = DeleteTranslationGroupCommand.create({
        resourceId: 'test-layout',
        resourceInternalId: mockResourceInternalId,
        resourceType: LocalizationResourceEnum.LAYOUT,
        organizationId: mockOrganizationId,
        environmentId: mockEnvironmentId,
        userId: mockUserId,
      });

      // Act
      const result = await usecase.execute(command);

      // Assert
      expect(result.success).toBe(true);
      expect(localizationGroupRepository.findByResource).toHaveBeenCalledWith(
        DalLocalizationResourceEnum.LAYOUT,
        mockResourceInternalId,
        mockEnvironmentId,
        mockOrganizationId
      );
    });
  });

  describe('session support', () => {
    it('should pass session to repositories when provided', async () => {
      // Arrange
      const mockSession = {} as any;
      localizationGroupRepository.findByResource.mockResolvedValue(mockLocalizationGroup);
      localizationRepository.delete.mockResolvedValue({
        acknowledged: true,
        deletedCount: 2,
      });
      localizationGroupRepository.delete.mockResolvedValue({
        acknowledged: true,
        deletedCount: 1,
      });

      const command = DeleteTranslationGroupCommand.create({
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId: mockOrganizationId,
        environmentId: mockEnvironmentId,
        userId: mockUserId,
        session: mockSession,
      });

      // Act
      await usecase.execute(command);

      // Assert
      expect(localizationRepository.delete).toHaveBeenCalledWith(
        expect.any(Object),
        { session: mockSession }
      );
      expect(localizationGroupRepository.delete).toHaveBeenCalledWith(
        expect.any(Object),
        { session: mockSession }
      );
    });
  });

  describe('cascading deletion', () => {
    it('should delete localizations before deleting the group', async () => {
      // Arrange
      const callOrder: string[] = [];
      localizationGroupRepository.findByResource.mockResolvedValue(mockLocalizationGroup);
      localizationRepository.delete.mockImplementation(async () => {
        callOrder.push('localizations');
        return { acknowledged: true, deletedCount: 3 };
      });
      localizationGroupRepository.delete.mockImplementation(async () => {
        callOrder.push('group');
        return { acknowledged: true, deletedCount: 1 };
      });

      const command = DeleteTranslationGroupCommand.create({
        resourceId: mockResourceId,
        resourceInternalId: mockResourceInternalId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        organizationId: mockOrganizationId,
        environmentId: mockEnvironmentId,
        userId: mockUserId,
      });

      // Act
      await usecase.execute(command);

      // Assert
      expect(callOrder).toEqual(['localizations', 'group']);
    });
  });
});
