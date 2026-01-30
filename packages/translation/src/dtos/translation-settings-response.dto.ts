import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { OpenAIModelEnum } from "../dal";

/**
 * Response DTO for translation settings
 *
 * Security: The actual API key is NEVER returned in the response.
 * Only a boolean flag indicating presence and the last 4 characters are exposed.
 *
 * @example Response
 * ```json
 * {
 *   "_id": "507f1f77bcf86cd799439011",
 *   "_organizationId": "507f1f77bcf86cd799439012",
 *   "hasApiKey": true,
 *   "apiKeyLast4": "1234",
 *   "openaiModel": "gpt-4o-mini",
 *   "defaultLocale": "en_US",
 *   "targetLocales": ["es_ES", "fr_FR", "de_DE"],
 *   "createdAt": "2024-01-15T10:30:00.000Z",
 *   "updatedAt": "2024-01-15T10:30:00.000Z"
 * }
 * ```
 */
export class TranslationSettingsResponseDto {
	@ApiProperty({
		description: "Unique identifier for the translation settings",
		example: "507f1f77bcf86cd799439011",
	})
	_id: string;

	@ApiProperty({
		description: "Organization ID these settings belong to",
		example: "507f1f77bcf86cd799439012",
	})
	_organizationId: string;

	/**
	 * Indicates whether an API key has been configured
	 * Used to show appropriate UI state without exposing the key
	 */
	@ApiProperty({
		description: "Whether an OpenAI API key is configured",
		example: true,
	})
	hasApiKey: boolean;

	/**
	 * Last 4 characters of the API key for identification
	 * Only populated if hasApiKey is true
	 */
	@ApiPropertyOptional({
		description: "Last 4 characters of the API key (for identification)",
		example: "1234",
	})
	apiKeyLast4?: string;

	/**
	 * OpenAI model configured for translation
	 */
	@ApiProperty({
		description: "OpenAI model for translation",
		enum: OpenAIModelEnum,
		example: OpenAIModelEnum.GPT_4O_MINI,
	})
	openaiModel: OpenAIModelEnum;

	/**
	 * Default source locale for translations
	 */
	@ApiProperty({
		description: "Default source locale (BCP-47 format)",
		example: "en_US",
	})
	defaultLocale: string;

	/**
	 * Configured target locales for translation
	 */
	@ApiProperty({
		description: "Target locales for translation",
		type: [String],
		example: ["es_ES", "fr_FR", "de_DE"],
	})
	targetLocales: string[];

	/**
	 * Settings creation timestamp
	 */
	@ApiProperty({
		description: "When the settings were created",
		example: "2024-01-15T10:30:00.000Z",
	})
	createdAt: string;

	/**
	 * Settings last update timestamp
	 */
	@ApiProperty({
		description: "When the settings were last updated",
		example: "2024-01-15T10:30:00.000Z",
	})
	updatedAt: string;
}
