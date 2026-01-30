import {
	IsEnum,
	IsMongoId,
	IsNotEmpty,
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
 * Command for deleting a translation group and all its child localizations
 *
 * This command is used when:
 * - A workflow is deleted
 * - A layout is deleted
 * - Manual cleanup is needed
 *
 * The deletion is cascading:
 * 1. Delete all Localization documents in the group
 * 2. Delete the LocalizationGroup document
 *
 * @example
 * ```typescript
 * const command = DeleteTranslationGroupCommand.create({
 *   resourceId: 'my-workflow',
 *   resourceType: LocalizationResourceEnum.WORKFLOW,
 *   organizationId: 'org_123',
 *   environmentId: 'env_456',
 *   userId: 'user_789',
 * });
 *
 * await deleteTranslationGroup.execute(command);
 * ```
 */
export class DeleteTranslationGroupCommand {
	/**
	 * Resource identifier (workflow slug or layout identifier)
	 */
	@IsString()
	@IsNotEmpty()
	resourceId: string;

	/**
	 * Internal resource ID (MongoDB ObjectId)
	 * Used for precise matching when resourceId is not unique
	 */
	@IsMongoId()
	@IsOptional()
	resourceInternalId?: string;

	/**
	 * Type of resource being deleted
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
	 * Create and validate a command instance
	 */
	static create(
		data: Omit<DeleteTranslationGroupCommand, "session"> & {
			session?: ClientSession | null;
		},
	): DeleteTranslationGroupCommand {
		const command = new DeleteTranslationGroupCommand();
		Object.assign(command, data);
		return command;
	}
}
