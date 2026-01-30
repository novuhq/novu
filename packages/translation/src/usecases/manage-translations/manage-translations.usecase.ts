import { Injectable, Logger } from '@nestjs/common';
import {
  LocalizationGroupRepository,
  LocalizationGroupEntity,
  LocalizationResourceEnum as DalLocalizationResourceEnum,
} from '@novu/dal';

import { ManageTranslationsCommand, LocalizationResourceEnum } from './manage-translations.command';

/**
 * Result of managing translations on a resource
 */
export interface ManageTranslationsResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Current enabled state after operation
   */
  enabled: boolean;

  /**
   * The LocalizationGroup entity (null if disabled)
   */
  localizationGroup?: LocalizationGroupEntity;

  /**
   * Whether auto-translate should be triggered
   * True when translations are enabled for the first time
   */
  shouldAutoTranslate: boolean;

  /**
   * Message describing the operation result
   */
  message: string;
}

/**
 * ManageTranslations Usecase
 *
 * Enables or disables translation management for resources (workflows/layouts).
 *
 * When enabled:
 * - Creates a LocalizationGroup for the resource if it doesn't exist
 * - Reuses existing group if already created (soft-enable)
 * - Signals that auto-translation should be queued (for Phase 7)
 *
 * When disabled:
 * - Soft-disables by not deleting data
 * - Translation data is preserved for potential re-enable
 * - The group remains but can be filtered out in queries
 *
 * @example
 * ```typescript
 * // Enable translations for a workflow
 * const result = await manageTranslations.execute(
 *   ManageTranslationsCommand.create({
 *     enabled: true,
 *     resourceId: 'welcome-email-workflow',
 *     resourceInternalId: '60d5ec9f1c9d440000a1b2c3',
 *     resourceName: 'Welcome Email Workflow',
 *     resourceType: LocalizationResourceEnum.WORKFLOW,
 *     organizationId: 'org_123',
 *     environmentId: 'env_456',
 *     userId: 'user_789',
 *   })
 * );
 *
 * if (result.shouldAutoTranslate) {
 *   // Queue auto-translate job (Phase 7)
 * }
 * ```
 */
@Injectable()
export class ManageTranslations {
  private readonly logger = new Logger(ManageTranslations.name);

  constructor(
    private readonly localizationGroupRepository: LocalizationGroupRepository
  ) {}

  /**
   * Execute the manage translations command
   *
   * @param command - The command containing enable/disable instructions
   * @returns Result with success status, group entity, and auto-translate flag
   */
  async execute(command: ManageTranslationsCommand): Promise<ManageTranslationsResult> {
    const {
      enabled,
      resourceId,
      resourceInternalId,
      resourceName,
      resourceType,
      organizationId,
      environmentId,
      session,
    } = command;

    // Validate required fields for enable operation
    if (enabled && !resourceInternalId) {
      throw new Error('resourceInternalId is required when enabling translations');
    }

    // Convert to DAL enum
    const dalResourceType = this.convertToDalResourceType(resourceType);

    if (enabled) {
      return this.enableTranslations(
        resourceId,
        resourceInternalId!,
        resourceName || resourceId,
        dalResourceType,
        organizationId,
        environmentId,
        session
      );
    } else {
      return this.disableTranslations(
        resourceId,
        resourceInternalId,
        dalResourceType,
        organizationId,
        environmentId
      );
    }
  }

  /**
   * Enable translations for a resource
   */
  private async enableTranslations(
    resourceId: string,
    resourceInternalId: string,
    resourceName: string,
    resourceType: DalLocalizationResourceEnum,
    organizationId: string,
    environmentId: string,
    session?: any
  ): Promise<ManageTranslationsResult> {
    // Check if group already exists
    const existingGroup = await this.localizationGroupRepository.findByResource(
      resourceType,
      resourceInternalId,
      environmentId,
      organizationId
    );

    if (existingGroup) {
      // Group exists - re-enable (soft-enable, just return existing)
      this.logger.log(
        `Re-enabled translations for ${resourceType}:${resourceId} (group: ${existingGroup._id})`
      );

      return {
        success: true,
        enabled: true,
        localizationGroup: existingGroup,
        shouldAutoTranslate: false, // Don't auto-translate on re-enable
        message: `Translations re-enabled for ${resourceType} "${resourceName}"`,
      };
    }

    // Create new LocalizationGroup
    const localizationGroup = await this.localizationGroupRepository.getOrCreateForResource(
      resourceType,
      resourceId,
      resourceName,
      resourceInternalId,
      environmentId,
      organizationId,
      session
    );

    this.logger.log(
      `Created LocalizationGroup ${localizationGroup?._id} for ${resourceType}:${resourceId}`
    );

    return {
      success: true,
      enabled: true,
      localizationGroup: localizationGroup || undefined,
      shouldAutoTranslate: true, // First-time enable triggers auto-translate
      message: `Translations enabled for ${resourceType} "${resourceName}"`,
    };
  }

  /**
   * Disable translations for a resource (soft-disable)
   */
  private async disableTranslations(
    resourceId: string,
    resourceInternalId: string | undefined,
    resourceType: DalLocalizationResourceEnum,
    organizationId: string,
    environmentId: string
  ): Promise<ManageTranslationsResult> {
    // Check if group exists
    let existingGroup: LocalizationGroupEntity | null = null;

    if (resourceInternalId) {
      existingGroup = await this.localizationGroupRepository.findByResource(
        resourceType,
        resourceInternalId,
        environmentId,
        organizationId
      );
    }

    if (!existingGroup) {
      // No group exists - nothing to disable
      this.logger.debug(
        `No LocalizationGroup found for ${resourceType}:${resourceId}, nothing to disable`
      );

      return {
        success: true,
        enabled: false,
        shouldAutoTranslate: false,
        message: `Translations already disabled for ${resourceType} "${resourceId}"`,
      };
    }

    // Soft-disable: We keep the data but mark as disabled
    // Note: In a more complete implementation, you might add an 'enabled' field to LocalizationGroup
    // For now, we just log the disable action - the group remains for potential re-enable
    this.logger.log(
      `Soft-disabled translations for ${resourceType}:${resourceId} (group: ${existingGroup._id})`
    );

    return {
      success: true,
      enabled: false,
      localizationGroup: existingGroup,
      shouldAutoTranslate: false,
      message: `Translations disabled for ${resourceType} "${resourceId}" (data preserved)`,
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
