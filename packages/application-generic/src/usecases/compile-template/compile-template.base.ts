import { OrganizationEntity, OrganizationRepository } from '@novu/dal';
import { ModuleRef } from '@nestjs/core';
import { Logger, NotFoundException } from '@nestjs/common';
import { ApiException } from '../../utils/exceptions';
import * as i18next from 'i18next';

export abstract class CompileTemplateBase {
  protected constructor(
    protected organizationRepository: OrganizationRepository,
    protected moduleRef: ModuleRef
  ) {}

  protected async getOrganization(
    organizationId: string
  ): Promise<OrganizationEntity | undefined> {
    const organization = await this.organizationRepository.findById(
      organizationId,
      'branding defaultLocale'
    );

    if (!organization) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    return organization;
  }

  protected async initiateTranslations(
    environmentId: string,
    organizationId: string,
    locale: string | undefined
  ) {
    try {
      if (
        process.env.NOVU_ENTERPRISE === 'true' ||
        process.env.CI_EE_TEST === 'true'
      ) {
        if (!require('@novu/ee-translation')?.TranslationsService) {
          throw new ApiException('Translation module is not loaded');
        }
        const service = this.moduleRef.get(
          require('@novu/ee-translation')?.TranslationsService,
          { strict: false }
        );
        const { namespaces, resources } = await service.getTranslationsList(
          environmentId,
          organizationId
        );

        await i18next.init({
          resources,
          ns: namespaces,
          defaultNS: false,
          nsSeparator: '.',
          lng: locale || 'en',
          compatibilityJSON: 'v2',
        });
      }
    } catch (e) {
      Logger.error(
        e,
        `Unexpected error while importing enterprise modules`,
        'TranslationsService'
      );
    }
  }
}
