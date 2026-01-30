import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  LocalizationGroupRepository,
  LocalizationRepository,
  LocalizationGroupEntity,
  LocalizationEntity,
  LocalizationResourceEnum as DalLocalizationResourceEnum,
} from '@novu/dal';

import { PublishTranslationGroupCommand, LocalizationResourceEnum } from './publish-translation-group.command';

/**
 * Result of publishing a translation group
 */
export interface PublishTranslationGroupResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * The published LocalizationGroup in target environment
   */
  publishedGroup?: LocalizationGroupEntity;

  /**
   * Number of localizations copied
   */
  copiedLocalizations: number;

  /**
   * Message describing the operation result
   */
  message: string;
}

/**
 * PublishTranslationGroup Usecase
 *
 * Syncs translations between environments (e.g., dev -> prod).
 *
 * The publish process:
 * 1. Find LocalizationGroup in source environment
 * 2. Create/update LocalizationGroup in target environment
 * 3. Copy all Localization documents to target environment
 * 4. Existing localizations in target are updated, new ones are created
 *
 * @example
 * ```typescript
 * // Publish translations from development to production
 * const result = await publishTranslationGroup.execute(
 *   PublishTranslationGroupCommand.create({
 *     user: { _id: 'user_123', organizationId: 'org_123', environmentId: 'env_dev' },
 *     resourceId: 'welcome-email-workflow',
 *     resourceInternalId: '60d5ec9f1c9d440000a1b2c3',
 *     resourceName: 'Welcome Email Workflow',
 *     resourceType: LocalizationResourceEnum.WORKFLOW,
 *     sourceEnvironmentId: 'env_dev',
 *     targetEnvironmentId: 'env_prod',
 *     targetResourceInternalId: '60d5ec9f1c9d440000a1b2c4',
 *   })
 * );
 *
 * console.log(`Published ${result.copiedLocalizations} translations to production`);
 * ```
 */
@Injectable()
export class PublishTranslationGroup {
  private readonly logger = new Logger(PublishTranslationGroup.name);

  constructor(
    private readonly localizationGroupRepository: LocalizationGroupRepository,
    private readonly localizationRepository: LocalizationRepository
  ) {}

  /**
   * Execute the publish translation group command
   *
   * @param command - The command containing source/target environment info
   * @returns Result with published group and localization counts
   * @throws NotFoundException if source group doesn't exist
   */
  async execute(command: PublishTranslationGroupCommand): Promise<PublishTranslationGroupResult> {
    const {
      user,
      resourceId,
      resourceInternalId,
      resourceName,
      resourceType,
      sourceEnvironmentId,
      targetEnvironmentId,
      targetResourceInternalId,
      session,
    } = command;

    // Convert to DAL enum
    const dalResourceType = this.convertToDalResourceType(resourceType);

    // Validate target internal ID
    if (!targetResourceInternalId) {
      throw new Error('targetResourceInternalId is required for publishing translations');
    }

    // Step 1: Find source LocalizationGroup
    let sourceGroup: LocalizationGroupEntity | null = null;

    if (resourceInternalId) {
      sourceGroup = await this.localizationGroupRepository.findByResource(
        dalResourceType,
        resourceInternalId,
        sourceEnvironmentId,
        user.organizationId
      );
    }

    if (!sourceGroup) {
      this.logger.debug(
        `No source LocalizationGroup found for ${resourceType}:${resourceId} in environment ${sourceEnvironmentId}`
      );

      return {
        success: true,
        copiedLocalizations: 0,
        message: `No translations to publish for ${resourceType} "${resourceId}"`,
      };
    }

    // Step 2: Get or create target LocalizationGroup
    const targetGroup = await this.localizationGroupRepository.getOrCreateForResource(
      dalResourceType,
      resourceId,
      resourceName || sourceGroup.resourceName,
      targetResourceInternalId,
      targetEnvironmentId,
      user.organizationId,
      session
    );

    if (!targetGroup) {
      throw new Error('Failed to create target LocalizationGroup');
    }

    this.logger.debug(
      `Publishing from group ${sourceGroup._id} to group ${targetGroup._id}`
    );

    // Step 3: Find all source localizations
    const sourceLocalizations = await this.localizationRepository.find(
      {
        _localizationGroupId: sourceGroup._id,
        _environmentId: sourceEnvironmentId,
        _organizationId: user.organizationId,
      }
    );

    if (sourceLocalizations.length === 0) {
      this.logger.debug(
        `No localizations found in source group ${sourceGroup._id}`
      );

      return {
        success: true,
        publishedGroup: targetGroup,
        copiedLocalizations: 0,
        message: `Translation group published but no localizations to copy`,
      };
    }

    // Step 4: Copy each localization to target environment
    let copiedCount = 0;

    for (const sourceLocalization of sourceLocalizations) {
      await this.copyLocalization(
        sourceLocalization,
        targetGroup._id,
        targetEnvironmentId,
        user.organizationId,
        session
      );
      copiedCount++;
    }

    this.logger.log(
      `Published LocalizationGroup to ${targetEnvironmentId}: ${copiedCount} localizations copied`
    );

    return {
      success: true,
      publishedGroup: targetGroup,
      copiedLocalizations: copiedCount,
      message: `Published ${copiedCount} translation(s) for ${resourceType} "${resourceId}" to target environment`,
    };
  }

  /**
   * Copy a single localization to target environment
   */
  private async copyLocalization(
    source: LocalizationEntity,
    targetGroupId: string,
    targetEnvironmentId: string,
    organizationId: string,
    session?: any
  ): Promise<void> {
    // Check if localization already exists in target
    const existingTarget = await this.localizationRepository.findOne({
      _localizationGroupId: targetGroupId,
      locale: source.locale,
      _environmentId: targetEnvironmentId,
      _organizationId: organizationId,
    });

    if (existingTarget) {
      // Update existing localization
      await this.localizationRepository.update(
        {
          _id: existingTarget._id,
          _environmentId: targetEnvironmentId,
          _organizationId: organizationId,
        },
        {
          $set: {
            content: source.content,
            updatedAt: new Date().toISOString(),
          },
        },
        { session }
      );

      this.logger.debug(
        `Updated localization ${existingTarget._id} (locale: ${source.locale})`
      );
    } else {
      // Create new localization
      await this.localizationRepository.create(
        {
          _localizationGroupId: targetGroupId,
          locale: source.locale,
          content: source.content,
          _environmentId: targetEnvironmentId,
          _organizationId: organizationId,
        },
        { session }
      );

      this.logger.debug(
        `Created new localization for locale ${source.locale} in target group ${targetGroupId}`
      );
    }
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
