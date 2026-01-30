import {
	IsArray,
	IsEnum,
	IsMongoId,
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
} from "class-validator";

/**
 * Resource types that support translation (matches TranslationResourceTypeEnum from shared)
 */
export enum EnqueueTranslationResourceTypeEnum {
	WORKFLOW = "workflow",
	LAYOUT = "layout",
}

/**
 * Content type hints for better translation quality
 */
export type TranslationContentType =
	| "email"
	| "sms"
	| "push"
	| "in-app"
	| "chat";

/**
 * Command for enqueueing a translation job for async processing
 *
 * This command creates a translation job in the Bull queue to be
 * processed by the TranslationWorker. Use this for:
 * - Large content that may take time to translate
 * - Batch operations where immediate response isn't needed
 * - Background translation during workflow save
 *
 * @example
 * ```typescript
 * const command = EnqueueTranslationCommand.create({
 *   resourceId: 'my-workflow',
 *   resourceType: EnqueueTranslationResourceTypeEnum.WORKFLOW,
 *   organizationId: 'org_123',
 *   environmentId: 'env_456',
 *   userId: 'user_789',
 *   sourceContent: {
 *     'step.email.subject': 'Welcome!',
 *     'step.email.body': '<p>Hello {{name}}</p>',
 *   },
 * });
 *
 * const result = await enqueueTranslation.execute(command);
 * console.log(`Job ID: ${result.jobReferenceId}`);
 * ```
 */
export class EnqueueTranslationCommand {
	/**
	 * Resource identifier (workflow slug or layout identifier)
	 */
	@IsString()
	@IsNotEmpty()
	resourceId: string;

	/**
	 * Internal resource ID (MongoDB ObjectId)
	 */
	@IsMongoId()
	@IsOptional()
	resourceInternalId?: string;

	/**
	 * Type of resource being translated
	 */
	@IsEnum(EnqueueTranslationResourceTypeEnum)
	@IsNotEmpty()
	resourceType: EnqueueTranslationResourceTypeEnum;

	/**
	 * Organization ID (used for settings lookup)
	 */
	@IsMongoId()
	@IsNotEmpty()
	organizationId: string;

	/**
	 * Environment ID
	 */
	@IsMongoId()
	@IsNotEmpty()
	environmentId: string;

	/**
	 * User requesting the translation
	 */
	@IsMongoId()
	@IsNotEmpty()
	userId: string;

	/**
	 * Optional: Override default target locales from org settings
	 */
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	targetLocales?: string[];

	/**
	 * Optional: Source locale override
	 */
	@IsString()
	@IsOptional()
	sourceLocale?: string;

	/**
	 * Content to translate, keyed by content identifier
	 */
	@IsObject()
	@IsNotEmpty()
	sourceContent: Record<string, string>;

	/**
	 * Optional: Content type hint for better translation quality
	 */
	@IsString()
	@IsOptional()
	contentType?: TranslationContentType;

	/**
	 * Optional: Custom instructions for translation
	 */
	@IsString()
	@IsOptional()
	customInstructions?: string;

	/**
	 * Create and validate a command instance
	 */
	static create(data: EnqueueTranslationCommand): EnqueueTranslationCommand {
		const command = new EnqueueTranslationCommand();
		Object.assign(command, data);
		return command;
	}
}

/**
 * Result of enqueueing a translation job
 */
export interface EnqueueTranslationResult {
	/**
	 * Whether the job was successfully enqueued
	 */
	success: boolean;

	/**
	 * Unique reference ID for tracking the job
	 */
	jobReferenceId: string;

	/**
	 * Queue name where the job was enqueued
	 */
	queueName: string;

	/**
	 * Estimated wait time in milliseconds (based on queue depth)
	 */
	estimatedWaitMs?: number;

	/**
	 * Error message if enqueueing failed
	 */
	error?: string;

	/**
	 * ISO timestamp when the job was enqueued
	 */
	enqueuedAt: string;
}
