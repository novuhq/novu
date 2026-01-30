import {
	IsBoolean,
	IsEnum,
	IsMongoId,
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
} from "class-validator";
import type { ClientSession } from "mongoose";

/**
 * Resource types that support translation management
 */
export enum LocalizationResourceEnum {
	WORKFLOW = "workflow",
	LAYOUT = "layout",
}

/**
 * Command for managing translations on resources (enable/disable)
 *
 * This command is used to:
 * - Enable translations for a workflow/layout (creates LocalizationGroup)
 * - Disable translations for a workflow/layout (soft-disable, keeps data)
 * - Re-enable translations (uses existing data)
 *
 * @example
 * ```typescript
 * // Enable translations for a workflow
 * const command = ManageTranslationsCommand.create({
 *   enabled: true,
 *   resourceId: 'my-workflow',
 *   resourceType: LocalizationResourceEnum.WORKFLOW,
 *   organizationId: 'org_123',
 *   environmentId: 'env_456',
 *   userId: 'user_789',
 *   resourceEntity: workflowEntity, // Full entity on first enable
 * });
 *
 * // Disable translations
 * const disableCommand = ManageTranslationsCommand.create({
 *   enabled: false,
 *   resourceId: 'my-workflow',
 *   resourceType: LocalizationResourceEnum.WORKFLOW,
 *   organizationId: 'org_123',
 *   environmentId: 'env_456',
 *   userId: 'user_789',
 * });
 * ```
 */
export class ManageTranslationsCommand {
	/**
	 * Whether translations should be enabled for this resource
	 */
	@IsBoolean()
	@IsNotEmpty()
	enabled: boolean;

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
	 * Resource name for display purposes
	 */
	@IsString()
	@IsOptional()
	resourceName?: string;

	/**
	 * Type of resource being managed
	 */
	@IsEnum(LocalizationResourceEnum)
	@IsNotEmpty()
	resourceType: LocalizationResourceEnum;

	/**
	 * Organization ID
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
	 * User performing the action
	 */
	@IsMongoId()
	@IsNotEmpty()
	userId: string;

	/**
	 * Optional MongoDB session for transaction support
	 */
	@IsOptional()
	session?: ClientSession | null;

	/**
	 * Full resource entity (used on initial enable to extract translatable content)
	 * This is passed when enabling translations for the first time or after updates
	 */
	@IsObject()
	@IsOptional()
	resourceEntity?: Record<string, unknown>;

	/**
	 * Create and validate a command instance
	 */
	static create(
		data: Omit<ManageTranslationsCommand, "session"> & {
			session?: ClientSession | null;
		},
	): ManageTranslationsCommand {
		const command = new ManageTranslationsCommand();
		Object.assign(command, data);
		return command;
	}
}
