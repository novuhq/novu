import { IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ClientSession } from 'mongoose';

/**
 * Resource types that support translation management
 */
export enum LocalizationResourceEnum {
  WORKFLOW = 'workflow',
  LAYOUT = 'layout',
}

/**
 * Command for duplicating translations when cloning a resource
 *
 * This command is used when:
 * - Duplicating a workflow (clone operation)
 * - Duplicating a layout
 * - Creating a new version of a resource with translations
 *
 * The duplication process:
 * 1. Find LocalizationGroup for source resource
 * 2. Create new LocalizationGroup for target resource
 * 3. Copy all Localization documents with new group reference
 *
 * @example
 * ```typescript
 * const command = DuplicateLocalesCommand.create({
 *   sourceResourceId: 'original-workflow',
 *   sourceResourceType: LocalizationResourceEnum.WORKFLOW,
 *   targetResourceId: 'cloned-workflow',
 *   targetResourceInternalId: 'new_mongo_id',
 *   targetResourceName: 'Cloned Workflow',
 *   organizationId: 'org_123',
 *   environmentId: 'env_456',
 *   userId: 'user_789',
 * });
 *
 * await duplicateLocales.execute(command);
 * ```
 */
export class DuplicateLocalesCommand {
  /**
   * Source resource identifier to copy translations from
   */
  @IsString()
  @IsNotEmpty()
  sourceResourceId: string;

  /**
   * Source internal resource ID (MongoDB ObjectId)
   */
  @IsMongoId()
  @IsOptional()
  sourceResourceInternalId?: string;

  /**
   * Type of resource (must match for both source and target)
   */
  @IsEnum(LocalizationResourceEnum)
  @IsNotEmpty()
  sourceResourceType: LocalizationResourceEnum;

  /**
   * Target resource identifier to copy translations to
   */
  @IsString()
  @IsNotEmpty()
  targetResourceId: string;

  /**
   * Target internal resource ID (MongoDB ObjectId)
   */
  @IsMongoId()
  @IsNotEmpty()
  targetResourceInternalId: string;

  /**
   * Target resource name for display purposes
   */
  @IsString()
  @IsOptional()
  targetResourceName?: string;

  /**
   * Organization ID (same for both source and target)
   */
  @IsMongoId()
  @IsNotEmpty()
  organizationId: string;

  /**
   * Environment ID (same for both source and target)
   */
  @IsMongoId()
  @IsNotEmpty()
  environmentId: string;

  /**
   * User performing the duplication
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
  static create(data: Omit<DuplicateLocalesCommand, 'session'> & { session?: ClientSession | null }): DuplicateLocalesCommand {
    const command = new DuplicateLocalesCommand();
    Object.assign(command, data);
    return command;
  }
}
