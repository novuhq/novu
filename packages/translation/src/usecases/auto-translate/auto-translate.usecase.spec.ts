import { Test, type TestingModule } from "@nestjs/testing";
import {
	LocalizationResourceEnum as DalLocalizationResourceEnum,
	LocalizationGroupRepository,
	LocalizationRepository,
} from "@novu/dal";

import { OpenAIModelEnum, TranslationSettingsRepository } from "../../dal";
import { OpenAITranslationService } from "../../services";
import {
	AutoTranslateCommand,
	LocalizationResourceEnum,
} from "./auto-translate.command";
import { AutoTranslate } from "./auto-translate.usecase";

describe("AutoTranslate Usecase", () => {
	let usecase: AutoTranslate;
	let localizationGroupRepository: jest.Mocked<LocalizationGroupRepository>;
	let localizationRepository: jest.Mocked<LocalizationRepository>;
	let settingsRepository: jest.Mocked<TranslationSettingsRepository>;
	let openAITranslationService: jest.Mocked<OpenAITranslationService>;

	const mockOrganizationId = "60d5ec9f1c9d440000org001";
	const mockEnvironmentId = "60d5ec9f1c9d440000env001";
	const mockUserId = "60d5ec9f1c9d440000user01";
	const mockResourceId = "test-workflow";
	const mockResourceInternalId = "60d5ec9f1c9d440000res001";
	const mockGroupId = "60d5ec9f1c9d440000grp001";

	const mockSettings = {
		_id: "60d5ec9f1c9d440000set001",
		_organizationId: mockOrganizationId,
		openaiApiKey: "sk-test-key",
		openaiModel: OpenAIModelEnum.GPT_4O_MINI,
		defaultLocale: "en_US",
		targetLocales: ["es_ES", "fr_FR"],
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const mockLocalizationGroup = {
		_id: mockGroupId,
		resourceType: DalLocalizationResourceEnum.WORKFLOW,
		resourceId: mockResourceId,
		resourceName: "Test Workflow",
		_resourceInternalId: mockResourceInternalId,
		_environmentId: mockEnvironmentId,
		_organizationId: mockOrganizationId,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const mockSourceContent = {
		"step.email.subject": "Welcome to {{company}}!",
		"step.email.body": "<p>Hello {{name}}</p>",
	};

	beforeEach(async () => {
		const mockLocalizationGroupRepo = {
			getOrCreateForResource: jest.fn(),
		};

		const mockLocalizationRepo = {
			findOne: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
		};

		const mockSettingsRepo = {
			findByOrganization: jest.fn(),
		};

		const mockOpenAIService = {
			translate: jest.fn(),
		};

		const moduleRef: TestingModule = await Test.createTestingModule({
			providers: [
				AutoTranslate,
				{
					provide: LocalizationGroupRepository,
					useValue: mockLocalizationGroupRepo,
				},
				{
					provide: LocalizationRepository,
					useValue: mockLocalizationRepo,
				},
				{
					provide: TranslationSettingsRepository,
					useValue: mockSettingsRepo,
				},
				{
					provide: OpenAITranslationService,
					useValue: mockOpenAIService,
				},
			],
		}).compile();

		usecase = moduleRef.get<AutoTranslate>(AutoTranslate);
		localizationGroupRepository = moduleRef.get(LocalizationGroupRepository);
		localizationRepository = moduleRef.get(LocalizationRepository);
		settingsRepository = moduleRef.get(TranslationSettingsRepository);
		openAITranslationService = moduleRef.get(OpenAITranslationService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("successful auto-translation", () => {
		it("should translate content to all target locales", async () => {
			// Arrange
			settingsRepository.findByOrganization.mockResolvedValue(mockSettings);
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockLocalizationGroup,
			);
			localizationRepository.findOne.mockResolvedValue(null);
			localizationRepository.create.mockResolvedValue({} as any);

			openAITranslationService.translate
				.mockResolvedValueOnce({
					success: true,
					translated: "Bienvenido a {{company}}!",
					validation: { valid: true, errors: [] },
				})
				.mockResolvedValueOnce({
					success: true,
					translated: "<p>Hola {{name}}</p>",
					validation: { valid: true, errors: [] },
				})
				.mockResolvedValueOnce({
					success: true,
					translated: "Bienvenue chez {{company}}!",
					validation: { valid: true, errors: [] },
				})
				.mockResolvedValueOnce({
					success: true,
					translated: "<p>Bonjour {{name}}</p>",
					validation: { valid: true, errors: [] },
				});

			const command = AutoTranslateCommand.create({
				resourceId: mockResourceId,
				resourceInternalId: mockResourceInternalId,
				resourceType: LocalizationResourceEnum.WORKFLOW,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				sourceContent: mockSourceContent,
			});

			// Act
			const result = await usecase.execute(command);

			// Assert
			expect(result.success).toBe(true);
			expect(result.sourceLocale).toBe("en_US");
			expect(result.metadata.totalLocales).toBe(2);
			expect(result.metadata.successfulLocales).toBe(2);
			expect(result.metadata.failedLocales).toBe(0);
			expect(result.localizationGroupId).toBe(mockGroupId);
			expect(openAITranslationService.translate).toHaveBeenCalledTimes(4); // 2 content items * 2 locales
		});

		it("should skip translation when target locale equals source locale", async () => {
			// Arrange
			const settingsWithSameLocale = {
				...mockSettings,
				targetLocales: ["en_US", "es_ES"], // en_US should be skipped
			};

			settingsRepository.findByOrganization.mockResolvedValue(
				settingsWithSameLocale,
			);
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockLocalizationGroup,
			);
			localizationRepository.findOne.mockResolvedValue(null);
			localizationRepository.create.mockResolvedValue({} as any);

			openAITranslationService.translate.mockResolvedValue({
				success: true,
				translated: "Bienvenido",
				validation: { valid: true, errors: [] },
			});

			const command = AutoTranslateCommand.create({
				resourceId: mockResourceId,
				resourceInternalId: mockResourceInternalId,
				resourceType: LocalizationResourceEnum.WORKFLOW,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				sourceContent: { "step.email.subject": "Welcome" },
			});

			// Act
			const result = await usecase.execute(command);

			// Assert
			expect(result.results).toHaveLength(2);
			expect(result.results[0].locale).toBe("en_US");
			expect(result.results[0].warnings).toContain(
				"Skipped: target locale same as source",
			);
			expect(result.results[1].locale).toBe("es_ES");
		});

		it("should update existing localizations instead of creating new ones", async () => {
			// Arrange
			const existingLocalization = {
				_id: "60d5ec9f1c9d440000loc001",
				locale: "es_ES",
				content: "old content",
				_localizationGroupId: mockGroupId,
				_environmentId: mockEnvironmentId,
				_organizationId: mockOrganizationId,
			};

			settingsRepository.findByOrganization.mockResolvedValue({
				...mockSettings,
				targetLocales: ["es_ES"],
			});
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockLocalizationGroup,
			);
			localizationRepository.findOne.mockResolvedValue(existingLocalization);
			localizationRepository.update.mockResolvedValue({
				matched: 1,
				modified: 1,
			});

			openAITranslationService.translate.mockResolvedValue({
				success: true,
				translated: "Bienvenido",
				validation: { valid: true, errors: [] },
			});

			const command = AutoTranslateCommand.create({
				resourceId: mockResourceId,
				resourceInternalId: mockResourceInternalId,
				resourceType: LocalizationResourceEnum.WORKFLOW,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				sourceContent: { "step.email.subject": "Welcome" },
			});

			// Act
			await usecase.execute(command);

			// Assert
			expect(localizationRepository.update).toHaveBeenCalled();
			expect(localizationRepository.create).not.toHaveBeenCalled();
		});
	});

	describe("error handling", () => {
		it("should return error when settings not configured", async () => {
			// Arrange
			settingsRepository.findByOrganization.mockResolvedValue(null);

			const command = AutoTranslateCommand.create({
				resourceId: mockResourceId,
				resourceInternalId: mockResourceInternalId,
				resourceType: LocalizationResourceEnum.WORKFLOW,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				sourceContent: mockSourceContent,
			});

			// Act
			const result = await usecase.execute(command);

			// Assert
			expect(result.success).toBe(false);
			expect(result.results[0].error).toContain("not configured");
		});

		it("should return error when OpenAI API key not configured", async () => {
			// Arrange
			settingsRepository.findByOrganization.mockResolvedValue({
				...mockSettings,
				openaiApiKey: "",
			});

			const command = AutoTranslateCommand.create({
				resourceId: mockResourceId,
				resourceInternalId: mockResourceInternalId,
				resourceType: LocalizationResourceEnum.WORKFLOW,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				sourceContent: mockSourceContent,
			});

			// Act
			const result = await usecase.execute(command);

			// Assert
			expect(result.success).toBe(false);
			expect(result.results[0].error).toContain("API key not configured");
		});

		it("should return error when no target locales configured", async () => {
			// Arrange
			settingsRepository.findByOrganization.mockResolvedValue({
				...mockSettings,
				targetLocales: [],
			});

			const command = AutoTranslateCommand.create({
				resourceId: mockResourceId,
				resourceInternalId: mockResourceInternalId,
				resourceType: LocalizationResourceEnum.WORKFLOW,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				sourceContent: mockSourceContent,
			});

			// Act
			const result = await usecase.execute(command);

			// Assert
			expect(result.success).toBe(false);
			expect(result.results[0].error).toContain("No target locales");
		});

		it("should return error when no content to translate", async () => {
			// Arrange
			settingsRepository.findByOrganization.mockResolvedValue(mockSettings);

			const command = AutoTranslateCommand.create({
				resourceId: mockResourceId,
				resourceInternalId: mockResourceInternalId,
				resourceType: LocalizationResourceEnum.WORKFLOW,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				sourceContent: {},
			});

			// Act
			const result = await usecase.execute(command);

			// Assert
			expect(result.success).toBe(false);
			expect(result.results[0].error).toContain("No content to translate");
		});

		it("should handle partial translation failures gracefully", async () => {
			// Arrange
			settingsRepository.findByOrganization.mockResolvedValue(mockSettings);
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockLocalizationGroup,
			);
			localizationRepository.findOne.mockResolvedValue(null);
			localizationRepository.create.mockResolvedValue({} as any);

			openAITranslationService.translate
				.mockResolvedValueOnce({
					success: true,
					translated: "Bienvenido",
					validation: { valid: true, errors: [] },
				})
				.mockResolvedValueOnce({
					success: false,
					error: "API rate limit exceeded",
				});

			const command = AutoTranslateCommand.create({
				resourceId: mockResourceId,
				resourceInternalId: mockResourceInternalId,
				resourceType: LocalizationResourceEnum.WORKFLOW,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				sourceContent: { "step.email.subject": "Welcome" },
				targetLocales: ["es_ES"],
			});

			// Act
			const result = await usecase.execute(command);

			// Assert - partial failure should still be marked as success with warnings
			expect(result.success).toBe(true);
			expect(result.results[0].success).toBe(true);
			expect(result.results[0].warnings).toBeDefined();
		});
	});

	describe("locale override", () => {
		it("should use override locales instead of settings", async () => {
			// Arrange
			settingsRepository.findByOrganization.mockResolvedValue(mockSettings);
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockLocalizationGroup,
			);
			localizationRepository.findOne.mockResolvedValue(null);
			localizationRepository.create.mockResolvedValue({} as any);

			openAITranslationService.translate.mockResolvedValue({
				success: true,
				translated: "Translated",
				validation: { valid: true, errors: [] },
			});

			const command = AutoTranslateCommand.create({
				resourceId: mockResourceId,
				resourceInternalId: mockResourceInternalId,
				resourceType: LocalizationResourceEnum.WORKFLOW,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				sourceContent: { "step.email.subject": "Welcome" },
				targetLocales: ["de_DE", "it_IT", "ja_JP"], // Override settings
			});

			// Act
			const result = await usecase.execute(command);

			// Assert
			expect(result.metadata.totalLocales).toBe(3);
			expect(result.results.map((r) => r.locale)).toEqual([
				"de_DE",
				"it_IT",
				"ja_JP",
			]);
		});

		it("should use override source locale", async () => {
			// Arrange
			settingsRepository.findByOrganization.mockResolvedValue(mockSettings);
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockLocalizationGroup,
			);
			localizationRepository.findOne.mockResolvedValue(null);
			localizationRepository.create.mockResolvedValue({} as any);

			openAITranslationService.translate.mockResolvedValue({
				success: true,
				translated: "Translated",
				validation: { valid: true, errors: [] },
			});

			const command = AutoTranslateCommand.create({
				resourceId: mockResourceId,
				resourceInternalId: mockResourceInternalId,
				resourceType: LocalizationResourceEnum.WORKFLOW,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				sourceContent: { "step.email.subject": "Hola" },
				sourceLocale: "es_ES", // Override source locale
				targetLocales: ["en_US"],
			});

			// Act
			const result = await usecase.execute(command);

			// Assert
			expect(result.sourceLocale).toBe("es_ES");
			expect(openAITranslationService.translate).toHaveBeenCalledWith(
				expect.objectContaining({
					sourceLocale: "es_ES",
					targetLocale: "en_US",
				}),
			);
		});
	});

	describe("content type and custom instructions", () => {
		it("should pass content type to translation service", async () => {
			// Arrange
			settingsRepository.findByOrganization.mockResolvedValue({
				...mockSettings,
				targetLocales: ["es_ES"],
			});
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockLocalizationGroup,
			);
			localizationRepository.findOne.mockResolvedValue(null);
			localizationRepository.create.mockResolvedValue({} as any);

			openAITranslationService.translate.mockResolvedValue({
				success: true,
				translated: "Translated",
				validation: { valid: true, errors: [] },
			});

			const command = AutoTranslateCommand.create({
				resourceId: mockResourceId,
				resourceInternalId: mockResourceInternalId,
				resourceType: LocalizationResourceEnum.WORKFLOW,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				sourceContent: { "step.sms.content": "Hi {{name}}!" },
				contentType: "sms",
			});

			// Act
			await usecase.execute(command);

			// Assert
			expect(openAITranslationService.translate).toHaveBeenCalledWith(
				expect.objectContaining({
					contentType: "sms",
				}),
			);
		});

		it("should pass custom instructions to translation service", async () => {
			// Arrange
			settingsRepository.findByOrganization.mockResolvedValue({
				...mockSettings,
				targetLocales: ["es_ES"],
			});
			localizationGroupRepository.getOrCreateForResource.mockResolvedValue(
				mockLocalizationGroup,
			);
			localizationRepository.findOne.mockResolvedValue(null);
			localizationRepository.create.mockResolvedValue({} as any);

			openAITranslationService.translate.mockResolvedValue({
				success: true,
				translated: "Translated",
				validation: { valid: true, errors: [] },
			});

			const command = AutoTranslateCommand.create({
				resourceId: mockResourceId,
				resourceInternalId: mockResourceInternalId,
				resourceType: LocalizationResourceEnum.WORKFLOW,
				organizationId: mockOrganizationId,
				environmentId: mockEnvironmentId,
				userId: mockUserId,
				sourceContent: { "step.email.subject": "Welcome" },
				customInstructions: "Use formal language",
			});

			// Act
			await usecase.execute(command);

			// Assert
			expect(openAITranslationService.translate).toHaveBeenCalledWith(
				expect.objectContaining({
					customInstructions: "Use formal language",
				}),
			);
		});
	});
});
