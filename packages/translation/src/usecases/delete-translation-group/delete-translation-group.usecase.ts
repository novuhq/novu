import { Injectable, Logger } from '@nestjs/common';
import {
  LocalizationGroupRepository,
  LocalizationRepository,
  LocalizationResourceEnum as DalLocalizationResourceEnum,
} from '@novu/dal';

import { DeleteTranslationGroupCommand, LocalizationResourceEnum } from './delete-translation-group.command';

/**
 * Result of deleting a translation group
 */
export interface DeleteTranslationGroupResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Number of localization entries deleted
   */
  deletedLocalizations: number;

  /**
   * Whether the group itself was deleted
   */
  groupDeleted: boolean;

  /**
   * Message describing the operation result
   */
  message: string;
}

/**
 * DeleteTranslationGroup Usecase
 *
 * Cleans up translation data when a resource is deleted.
 * Performs cascading deletion:
 * 1. Delete all Localization documents in the group
 * 2. Delete the LocalizationGroup document
 *
 * This ensures no orphaned translation data remains after resource deletion.
 *
 * @example
 * ```typescript
 * // Delete translations when a workflow is deleted
 * const result = await deleteTranslationGroup.execute(
 *   DeleteTranslationGroupCommand.create({
 *     resourceId: 'welcome-email-workflow',
 *     resourceInternalId: '60d5ec9f1c9d440000a1b2c3',
 *     resourceType: LocalizationResourceEnum.WORKFLOW,
 *     organizationId: 'org_123',
 *     environmentId: 'env_456',
 *     userId: 'user_789',
 *   })
 * );
 *
 * console.log(`Deleted ${result.deletedLocalizations} localizations`);
 * ```
 */
@Injectable()
export class DeleteTranslationGroup {
  private readonly logger = new Logger(DeleteTranslationGroup.name);

  constructor(
    private readonly localizationGroupRepository: LocalizationGroupRepository,
    private readonly localizationRepository: LocalizationRepository
  ) {}

  /**
   * Execute the delete translation group command
   *
   * @param command - The command containing resource identification
   * @returns Result with deletion counts and status
   */
  async execute(command: DeleteTranslationGroupCommand): Promise<DeleteTranslationGroupResult> {
    const {
      resourceId,
      resourceInternalId,
      resourceType,
      organizationId,
      environmentId,
      session,
    } = command;

    // Convert to DAL enum
    const dalResourceType = this.convertToDalResourceType(resourceType);

    // Find the LocalizationGroup
    let localizationGroup = null;

    if (resourceInternalId) {
      localizationGroup = await this.localizationGroupRepository.findByResource(
        dalResourceType,
        resourceInternalId,
        environmentId,
        organizationId
      );
    }

    if (!localizationGroup) {
      // No group found - nothing to delete
      this.logger.debug(
        `No LocalizationGroup found for ${resourceType}:${resourceId}, nothing to delete`
      );

      return {
        success: true,
        deletedLocalizations: 0,
        groupDeleted: false,
        message: `No translations found for ${resourceType} "${resourceId}"`,
      };
    }

    const groupId = localizationGroup._id;

    // Step 1: Delete all Localization documents in this group
    const localizationDeleteResult = await this.localizationRepository.delete(
      {
        _localizationGroupId: groupId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      { session }
    );

    const deletedLocalizations = localizationDeleteResult.deletedCount;

    this.logger.debug(
      `Deleted ${deletedLocalizations} Localization documents for group ${groupId}`
    );

    // Step 2: Delete the LocalizationGroup document
    const groupDeleteResult = await this.localizationGroupRepository.delete(
      {
        _id: groupId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      { session }
    );

    const groupDeleted = groupDeleteResult.deletedCount > 0;

    if (groupDeleted) {
      this.logger.log(
        `Deleted LocalizationGroup ${groupId} and ${deletedLocalizations} localizations for ${resourceType}:${resourceId}`
      );
    }

    return {
      success: true,
      deletedLocalizations,
      groupDeleted,
      message: `Deleted translations for ${resourceType} "${resourceId}": ${deletedLocalizations} localization(s)`,
    };
  }

  /**
   * Convert local enum to DAL enum
   */
  private convertToDalResourceType(resourceType: LocalizationResourceEnum): DalLocalizationResourceEnum {
    switch (resourceType) {
      case LocalizationResourceEnum.WORKFLOW:
        return DalLocalizationResourceEnum.WORKFLOW;
      case LocalizationResourceEnum.LAYOUT:
        return DalLocalizationResourceEnum.LAYOUT;
      default:
        throw new Error(`Unknown resource type: ${resourceType}`);
    }
  }
}
