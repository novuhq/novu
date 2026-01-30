import { Test, type TestingModule } from "@nestjs/testing";
import {
	LocalizationResourceEnum as DalLocalizationResourceEnum,
	LocalizationGroupRepository,
	LocalizationRepository,
} from "@novu/dal";
import {
	DuplicateLocalesCommand,
	LocalizationResourceEnum,
} from "./duplicate-locales.command";
import {
	DuplicateLocales,
	DuplicateLocalesResult,
} from "./duplicate-locales.usecase";

describe("DuplicateLocales Usecase", () => {
	let usecase: DuplicateLocales;
	let localizationGroupRepository: jest.Mocked<LocalizationGroupRepository>;
	let localizationRepository: jest.Mocked<LocalizationRepository>;

	const mockOrganizationId = "60d5ec9f1c9d440000org001";
	const mockEnvironmentId = "60d5ec9f1c9d440000env001";
	const mockUserId = "60d5ec9f1c9d440000user01";
	const mockSourceResourceId = "original-workflow";
	const mockSourceInternalId = "60d5ec9f1c9d440000res001";
	const mockTargetResourceId = "cloned-workflow";
	const mockTargetInternalId = "60d5ec9f1c9d440000res002";
	const mockSourceGroupId = "60d5ec9f1c9d440000grp001";
	const mockTargetGroupId = "60d5ec9f1c9d440000grp002";

	const mockSourceGroup = {
		_id: mockSourceGroupId,
		resourceType: DalLocalizationResourceEnum.WORKFLOW,
		resourceId: mockSourceResourceId,
		resourceName: "Original Workflow",
		_resourceInternalId: mockSourceInternalId,
		_environmentId: mockEnvironmentId,
		_organizationId: mockOrganizationId,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const mockTargetGroup = {
		_id: mockTargetGroupId,
		resourceType: DalLocalizationResourceEnum.WORKFLOW,
		resourceId: mockTargetResourceId,
		resourceName: "Cloned Workflow",
		_resourceInternalId: mockTargetInternalId,
		_environmentId: mockEnvironmentId,
		_organizationId: mockOrganizationId,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const mockSourceLocalizations = [
		{
			_id: "60d5ec9f1c9d440000loc001",
			locale: "es_ES",
			content: JSON.stringify({ "step.email.subject": "Bienvenido" }),
			_localizationGroupId: mockSourceGroupId,
			_environmentId: mockEnvironmentId,
			_organizationId: mockOrganizationId,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		{
			_id: "60d5ec9f1c9d440000loc002",
			locale: "fr_FR",
			content: JSON.stringify({ "step.email.subject": "Bienvenue" }),
			_localizationGroupId: mockSourceGroupId,
			_environmentId: mockEnvironmentId,
			_organizationId: mockOrganizationId,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		{
			_id: "60d5ec9f1c9d440000loc003",
			locale: "de_DE",
			content: JSON.stringify({ "step.email.subject": "Willkommen" }),
			_localizationGroupId: mockSourceGroupId,
			_environmentId: mockEnvironmentId,
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
			create: jest.fn(),
		};

		const moduleRef: TestingModule = await Test.createTestingModule({
			providers: [
				DuplicateLocales,
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

		usecase = moduleRef.get<DuplicateLocales>(DuplicateLocales);
		localizationGroupRepository = moduleRef.get(LocalizationGroupRepository);
		localizationRepository = moduleRef.get(LocalizationRepository);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("duplicate with existing translations", () => {
		it("should duplicate all localizations to new resource", async () => {
			// Arrange
			localizationGroupRepository.findByResource.mockResolvedValue(
				mockSourceGroup,
			);
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockTargetGroup,
			);
			localizationRepository.find.mockResolvedValue(mockSourceLocalizations);
			localizationRepository.create.mockResolvedValue({} as any);

			const command = DuplicateLocalesCommand.create({
				sourceResourceId: mockSourceResourceId,
				sourceResourceInternalId: mockSourceInternalId,
				sourceResourceType: LocalizationResourceEnum.WORKFLOW,
				targetResourceId: mockTargetResourceId,
				targetResourceInternalId: mockTargetInternalId,
				targetResourceName: "Cloned Workflow",
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
			});

			// Act
			const result = await usecase.execute(command);

			// Assert
			expect(result.success).toBe(true);
			expect(result.duplicatedLocalizations).toBe(3);
			expect(result.targetGroup).toEqual(mockTargetGroup);
			expect(localizationRepository.create).toHaveBeenCalledTimes(3);

			// Verify each localization was created with correct data
			expect(localizationRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					_localizationGroupId: mockTargetGroupId,
					locale: "es_ES",
					_environmentId: mockEnvironmentId,
					_organizationId: mockOrganizationId,
				}),
				expect.any(Object),
			);
		});

		it("should use source resource name when target name not provided", async () => {
			// Arrange
			localizationGroupRepository.findByResource.mockResolvedValue(
				mockSourceGroup,
			);
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockTargetGroup,
			);
			localizationRepository.find.mockResolvedValue(mockSourceLocalizations);
			localizationRepository.create.mockResolvedValue({} as any);

			const command = DuplicateLocalesCommand.create({
				sourceResourceId: mockSourceResourceId,
				sourceResourceInternalId: mockSourceInternalId,
				sourceResourceType: LocalizationResourceEnum.WORKFLOW,
				targetResourceId: mockTargetResourceId,
				targetResourceInternalId: mockTargetInternalId,
				// targetResourceName not provided
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
			});

			// Act
			await usecase.execute(command);

			// Assert
			expect(
				localizationGroupRepository.getOrCreateForResource,
			).toHaveBeenCalledWith(
				DalLocalizationResourceEnum.WORKFLOW,
				mockTargetResourceId,
				"Original Workflow", // Falls back to source group name
				mockTargetInternalId,
				mockEnvironmentId,
				mockOrganizationId,
				undefined,
			);
		});
	});

	describe("duplicate with no source translations", () => {
		it("should create target group but return zero duplicated localizations", async () => {
			// Arrange
			localizationGroupRepository.findByResource.mockResolvedValue(
				mockSourceGroup,
			);
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockTargetGroup,
			);
			localizationRepository.find.mockResolvedValue([]);

			const command = DuplicateLocalesCommand.create({
				sourceResourceId: mockSourceResourceId,
				sourceResourceInternalId: mockSourceInternalId,
				sourceResourceType: LocalizationResourceEnum.WORKFLOW,
				targetResourceId: mockTargetResourceId,
				targetResourceInternalId: mockTargetInternalId,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
			});

			// Act
			const result = await usecase.execute(command);

			// Assert
			expect(result.success).toBe(true);
			expect(result.duplicatedLocalizations).toBe(0);
			expect(result.targetGroup).toEqual(mockTargetGroup);
			expect(result.message).toContain("no localizations to duplicate");
			expect(localizationRepository.create).not.toHaveBeenCalled();
		});
	});

	describe("duplicate with no source group", () => {
		it("should return success when source group does not exist", async () => {
			// Arrange
			localizationGroupRepository.findByResource.mockResolvedValue(null);

			const command = DuplicateLocalesCommand.create({
				sourceResourceId: mockSourceResourceId,
				sourceResourceInternalId: mockSourceInternalId,
				sourceResourceType: LocalizationResourceEnum.WORKFLOW,
				targetResourceId: mockTargetResourceId,
				targetResourceInternalId: mockTargetInternalId,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
			});

			// Act
			const result = await usecase.execute(command);

			// Assert
			expect(result.success).toBe(true);
			expect(result.duplicatedLocalizations).toBe(0);
			expect(result.targetGroup).toBeUndefined();
			expect(result.message).toContain("No translations to duplicate");
			expect(
				localizationGroupRepository.getOrCreateForResource,
			).not.toHaveBeenCalled();
		});
	});

	describe("error handling", () => {
		it("should throw error when target group creation fails", async () => {
			// Arrange
			localizationGroupRepository.findByResource.mockResolvedValue(
				mockSourceGroup,
			);
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				null,
			);

			const command = DuplicateLocalesCommand.create({
				sourceResourceId: mockSourceResourceId,
				sourceResourceInternalId: mockSourceInternalId,
				sourceResourceType: LocalizationResourceEnum.WORKFLOW,
				targetResourceId: mockTargetResourceId,
				targetResourceInternalId: mockTargetInternalId,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
			});

			// Act & Assert
			await expect(usecase.execute(command)).rejects.toThrow(
				"Failed to create target LocalizationGroup",
			);
		});
	});

	describe("resource type handling", () => {
		it("should handle LAYOUT resource type", async () => {
			// Arrange
			const layoutSourceGroup = {
				...mockSourceGroup,
				resourceType: DalLocalizationResourceEnum.LAYOUT,
				resourceId: "original-layout",
			};
			const layoutTargetGroup = {
				...mockTargetGroup,
				resourceType: DalLocalizationResourceEnum.LAYOUT,
				resourceId: "cloned-layout",
			};

			localizationGroupRepository.findByResource.mockResolvedValue(
				layoutSourceGroup,
			);
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				layoutTargetGroup,
			);
			localizationRepository.find.mockResolvedValue([
				mockSourceLocalizations[0],
			]);
			localizationRepository.create.mockResolvedValue({} as any);

			const command = DuplicateLocalesCommand.create({
				sourceResourceId: "original-layout",
				sourceResourceInternalId: mockSourceInternalId,
				sourceResourceType: LocalizationResourceEnum.LAYOUT,
				targetResourceId: "cloned-layout",
				targetResourceInternalId: mockTargetInternalId,
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
				mockSourceInternalId,
				mockEnvironmentId,
				mockOrganizationId,
			);
		});
	});

	describe("session support", () => {
		it("should pass session to repositories when provided", async () => {
			// Arrange
			const mockSession = {} as any;
			localizationGroupRepository.findByResource.mockResolvedValue(
				mockSourceGroup,
			);
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockTargetGroup,
			);
			localizationRepository.find.mockResolvedValue(mockSourceLocalizations);
			localizationRepository.create.mockResolvedValue({} as any);

			const command = DuplicateLocalesCommand.create({
				sourceResourceId: mockSourceResourceId,
				sourceResourceInternalId: mockSourceInternalId,
				sourceResourceType: LocalizationResourceEnum.WORKFLOW,
				targetResourceId: mockTargetResourceId,
				targetResourceInternalId: mockTargetInternalId,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				session: mockSession,
			});

			// Act
			await usecase.execute(command);

			// Assert
			expect(
				localizationGroupRepository.getOrCreateForResource,
			).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(String),
				expect.any(String),
				mockTargetInternalId,
				mockEnvironmentId,
				mockOrganizationId,
				mockSession,
			);
			expect(localizationRepository.create).toHaveBeenCalledWith(
				expect.any(Object),
				{ session: mockSession },
			);
		});
	});

	describe("content preservation", () => {
		it("should preserve exact content during duplication", async () => {
			// Arrange
			localizationGroupRepository.findByResource.mockResolvedValue(
				mockSourceGroup,
			);
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockTargetGroup,
			);
			localizationRepository.find.mockResolvedValue([
				mockSourceLocalizations[0],
			]);
			localizationRepository.create.mockResolvedValue({} as any);

			const command = DuplicateLocalesCommand.create({
				sourceResourceId: mockSourceResourceId,
				sourceResourceInternalId: mockSourceInternalId,
				sourceResourceType: LocalizationResourceEnum.WORKFLOW,
				targetResourceId: mockTargetResourceId,
				targetResourceInternalId: mockTargetInternalId,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
			});

			// Act
			await usecase.execute(command);

			// Assert
			expect(localizationRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					content: mockSourceLocalizations[0].content,
				}),
				expect.any(Object),
			);
		});
	});
});
