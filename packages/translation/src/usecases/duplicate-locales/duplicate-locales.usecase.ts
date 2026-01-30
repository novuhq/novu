import { Injectable, Logger } from "@nestjs/common";
import {
	LocalizationResourceEnum as DalLocalizationResourceEnum,
	type LocalizationGroupEntity,
	type LocalizationGroupRepository,
	type LocalizationRepository,
} from "@novu/dal";

import {
	type DuplicateLocalesCommand,
	LocalizationResourceEnum,
} from "./duplicate-locales.command";

/**
 * Result of duplicating locales
 */
export interface DuplicateLocalesResult {
	/**
	 * Whether the operation was successful
	 */
	success: boolean;

	/**
	 * The new LocalizationGroup for the duplicated resource
	 */
	targetGroup?: LocalizationGroupEntity;

	/**
	 * Number of localizations duplicated
	 */
	duplicatedLocalizations: number;

	/**
	 * Message describing the operation result
	 */
	message: string;
}

/**
 * DuplicateLocales Usecase
 *
 * Copies translations when duplicating/cloning a resource.
 *
 * The duplication process:
 * 1. Find LocalizationGroup for source resource
 * 2. Create new LocalizationGroup for target resource
 * 3. Copy all Localization documents with new group reference
 *
 * @example
 * ```typescript
 * // Duplicate translations when cloning a workflow
 * const result = await duplicateLocales.execute(
 *   DuplicateLocalesCommand.create({
 *     sourceResourceId: 'original-workflow',
 *     sourceResourceInternalId: '60d5ec9f1c9d440000a1b2c3',
 *     sourceResourceType: LocalizationResourceEnum.WORKFLOW,
 *     targetResourceId: 'cloned-workflow',
 *     targetResourceInternalId: '60d5ec9f1c9d440000a1b2c4',
 *     targetResourceName: 'Cloned Workflow',
 *     organizationId: 'org_123',
 *     environmentId: 'env_456',
 *     userId: 'user_789',
 *   })
 * );
 *
 * console.log(`Duplicated ${result.duplicatedLocalizations} translations`);
 * ```
 */
@Injectable()
export class DuplicateLocales {
	private readonly logger = new Logger(DuplicateLocales.name);

	constructor(
		private readonly localizationGroupRepository: LocalizationGroupRepository,
		private readonly localizationRepository: LocalizationRepository,
	) {}

	/**
	 * Execute the duplicate locales command
	 *
	 * @param command - The command containing source/target resource info
	 * @returns Result with new group and duplication counts
	 */
	async execute(
		command: DuplicateLocalesCommand,
	): Promise<DuplicateLocalesResult> {
		const {
			sourceResourceId,
			sourceResourceInternalId,
			sourceResourceType,
			targetResourceId,
			targetResourceInternalId,
			targetResourceName,
			organizationId,
			environmentId,
			session,
		} = command;

		// Convert to DAL enum
		const dalResourceType = this.convertToDalResourceType(sourceResourceType);

		// Step 1: Find source LocalizationGroup
		let sourceGroup: LocalizationGroupEntity | null = null;

		if (sourceResourceInternalId) {
			sourceGroup = await this.localizationGroupRepository.findByResource(
				dalResourceType,
				sourceResourceInternalId,
				environmentId,
				organizationId,
			);
		}

		if (!sourceGroup) {
			this.logger.debug(
				`No source LocalizationGroup found for ${sourceResourceType}:${sourceResourceId}, nothing to duplicate`,
			);

			return {
				success: true,
				duplicatedLocalizations: 0,
				message: `No translations to duplicate from ${sourceResourceType} "${sourceResourceId}"`,
			};
		}

		// Step 2: Create new LocalizationGroup for target
		const targetGroup =
			await this.localizationGroupRepository.getOrCreateForResource(
				dalResourceType,
				targetResourceId,
				targetResourceName || sourceGroup.resourceName,
				targetResourceInternalId,
				environmentId,
				organizationId,
				session,
			);

		if (!targetGroup) {
			throw new Error("Failed to create target LocalizationGroup");
		}

		this.logger.debug(
			`Created target LocalizationGroup ${targetGroup._id} for ${sourceResourceType}:${targetResourceId}`,
		);

		// Step 3: Find all source localizations
		const sourceLocalizations = await this.localizationRepository.find({
			_localizationGroupId: sourceGroup._id,
			_environmentId: environmentId,
			_organizationId: organizationId,
		});

		if (sourceLocalizations.length === 0) {
			this.logger.debug(
				`No localizations found in source group ${sourceGroup._id}`,
			);

			return {
				success: true,
				targetGroup,
				duplicatedLocalizations: 0,
				message: `Translation group created but no localizations to duplicate`,
			};
		}

		// Step 4: Duplicate each localization
		let duplicatedCount = 0;

		for (const sourceLocalization of sourceLocalizations) {
			await this.localizationRepository.create(
				{
					_localizationGroupId: targetGroup._id,
					locale: sourceLocalization.locale,
					content: sourceLocalization.content,
					_environmentId: environmentId,
					_organizationId: organizationId,
				},
				{ session },
			);

			duplicatedCount++;
		}

		this.logger.log(
			`Duplicated ${duplicatedCount} localizations from ${sourceResourceId} to ${targetResourceId}`,
		);

		return {
			success: true,
			targetGroup,
			duplicatedLocalizations: duplicatedCount,
			message: `Duplicated ${duplicatedCount} translation(s) to ${sourceResourceType} "${targetResourceId}"`,
		};
	}

	/**
	 * Convert local enum to DAL enum
	 */
	private convertToDalResourceType(
		resourceType: LocalizationResourceEnum,
	): DalLocalizationResourceEnum {
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
