import { IsEnum, IsMongoId, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { ClientSession } from 'mongoose';

/**
 * Resource types that support translation management
 */
export enum LocalizationResourceEnum {
  WORKFLOW = 'workflow',
  LAYOUT = 'layout',
}

/**
 * User session data for command execution
 */
export interface UserSessionData {
  _id: string;
  organizationId: string;
  environmentId: string;
}

/**
 * Command for publishing (syncing) translations between environments
 *
 * This command is used when:
 * - Promoting workflows/layouts from development to production
 * - Syncing translations after changes in one environment
 * - Restoring translations from backup environment
 *
 * The publish process:
 * 1. Find LocalizationGroup in source environment
 * 2. Create/update LocalizationGroup in target environment
 * 3. Copy all Localization documents to target environment
 *
 * @example
 * ```typescript
 * const command = PublishTranslationGroupCommand.create({
 *   user: { _id: 'user_123', organizationId: 'org_123', environmentId: 'env_dev' },
 *   resourceId: 'my-workflow',
 *   resourceType: LocalizationResourceEnum.WORKFLOW,
 *   sourceEnvironmentId: 'env_dev',
 *   targetEnvironmentId: 'env_prod',
 * });
 *
 * await publishTranslationGroup.execute(command);
 * ```
 */
export class PublishTranslationGroupCommand {
  /**
   * User performing the publish action
   */
  @IsObject()
  @IsNotEmpty()
  user: UserSessionData;

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
   * Type of resource being published
   */
  @IsEnum(LocalizationResourceEnum)
  @IsNotEmpty()
  resourceType: LocalizationResourceEnum;

  /**
   * Source environment to copy translations from
   */
  @IsMongoId()
  @IsNotEmpty()
  sourceEnvironmentId: string;

  /**
   * Target environment to copy translations to
   */
  @IsMongoId()
  @IsNotEmpty()
  targetEnvironmentId: string;

  /**
   * Target internal resource ID (MongoDB ObjectId) in target environment
   */
  @IsMongoId()
  @IsOptional()
  targetResourceInternalId?: string;

  /**
   * Optional MongoDB session for transaction support
   */
  @IsOptional()
  session?: ClientSession | null;

  /**
   * Create and validate a command instance
   */
  static create(data: Omit<PublishTranslationGroupCommand, 'session'> & { session?: ClientSession | null }): PublishTranslationGroupCommand {
    const command = new PublishTranslationGroupCommand();
    Object.assign(command, data);
    return command;
  }
}
