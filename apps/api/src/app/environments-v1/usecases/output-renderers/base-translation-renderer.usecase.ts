import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { LayoutDto, PinoLogger } from '@novu/application-generic';
import { LocalizationResourceEnum, NotificationTemplateEntity, OrganizationEntity } from '@novu/dal';
import { createLiquidEngine } from '@novu/framework/internal';
import { FullPayloadForRender } from './render-command';

type TranslationContext = {
  i18nInstance: unknown;
  liquidEngine: unknown;
  locale: string;
  resourceId: string;
};

@Injectable()
export abstract class BaseTranslationRendererUsecase {
  constructor(
    protected moduleRef: ModuleRef,
    protected logger: PinoLogger
  ) {}

  protected async processTranslations({
    controls,
    variables,
    environmentId,
    organizationId,
    resourceId,
    resourceType,
    locale,
    resourceEntity,
    organization,
  }: {
    controls: Record<string, unknown>;
    variables: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    resourceId?: string;
    resourceType?: LocalizationResourceEnum;
    locale?: string;
    resourceEntity?: NotificationTemplateEntity | LayoutDto;
    organization?: OrganizationEntity;
  }): Promise<Record<string, unknown>> {
    if (process.env.NOVU_ENTERPRISE !== 'true' && process.env.CI_EE_TEST !== 'true') {
      return controls;
    }

    return this.executeTranslation({
      content: controls,
      variables,
      environmentId,
      organizationId,
      resourceId,
      resourceType,
      locale,
      resourceEntity,
      organization,
    }) as Promise<Record<string, unknown>>;
  }

  protected async processStringTranslations({
    content,
    variables,
    environmentId,
    organizationId,
    resourceId,
    resourceType,
    locale,
    organization,
  }: {
    content: string;
    variables: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    resourceId?: string;
    resourceType?: LocalizationResourceEnum;
    locale?: string;
    organization?: OrganizationEntity;
  }): Promise<string> {
    if (process.env.NOVU_ENTERPRISE !== 'true' && process.env.CI_EE_TEST !== 'true') {
      return content;
    }

    return this.executeTranslation({
      content,
      variables,
      environmentId,
      organizationId,
      resourceId,
      resourceType,
      locale,
      organization,
    }) as Promise<string>;
  }

  protected async createTranslationContext({
    environmentId,
    organizationId,
    resourceId,
    resourceType,
    locale,
    organization,
    resourceEntity,
  }: {
    environmentId: string;
    organizationId: string;
    resourceId?: string;
    resourceType?: LocalizationResourceEnum;
    locale?: string;
    organization?: OrganizationEntity;
    resourceEntity?: NotificationTemplateEntity | LayoutDto;
  }): Promise<TranslationContext | null> {
    if (process.env.NOVU_ENTERPRISE !== 'true' && process.env.CI_EE_TEST !== 'true') {
      return null;
    }

    if (!resourceId) {
      return null;
    }

    try {
      const translate = this.getTranslationModule();
      const liquidEngine = createLiquidEngine();

      return await translate.createContext({
        resourceId,
        resourceType,
        organizationId,
        environmentId,
        userId: 'system',
        locale,
        liquidEngine,
        organization,
        resourceEntity,
      });
    } catch (error) {
      const errorMessage = error?.message || String(error);
      const isExpectedError =
        error?.status === 402 ||
        errorMessage.includes('Translation is not enabled') ||
        errorMessage.includes('Translation feature is not available on your plan') ||
        errorMessage.includes('No translation found');

      if (!isExpectedError) {
        this.logger.error({
          error: errorMessage,
          resourceId,
          resourceType,
          organizationId,
          environmentId,
          locale,
          stack: error?.stack,
        }, 'Unexpected error during translation context creation');
      }

      return null;
    }
  }

  protected async processStringWithContext({
    context,
    content,
    variables,
  }: {
    context: TranslationContext | null;
    content: string;
    variables: FullPayloadForRender;
  }): Promise<string> {
    if ((process.env.NOVU_ENTERPRISE !== 'true' && process.env.CI_EE_TEST !== 'true') || !context) {
      return content;
    }

    try {
      const translate = this.getTranslationModule();

      return await translate.executeWithContext(context, content, variables);
    } catch (error) {
      this.logger.error({
        error: error?.message || error,
        resourceId: context.resourceId,
        locale: context.locale,
        stack: error?.stack,
      }, 'Translation with context failed');

      throw new InternalServerErrorException(
        `Translation processing failed for resource ${context.resourceId}: ${error?.message || String(error)}`
      );
    }
  }

  private async executeTranslation({
    content,
    variables,
    environmentId,
    organizationId,
    resourceId,
    resourceType,
    locale,
    resourceEntity,
    organization,
  }: {
    content: string | Record<string, unknown>;
    variables: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    resourceId?: string;
    resourceType?: LocalizationResourceEnum;
    locale?: string;
    resourceEntity?: NotificationTemplateEntity | LayoutDto;
    organization?: OrganizationEntity;
  }): Promise<string | Record<string, unknown>> {
    if (!resourceId) {
      this.logger.warn({
        resourceId,
        resourceType,
        organizationId,
        environmentId,
        locale,
      }, 'Resource ID is required for translation module');

      return content;
    }

    try {
      const translate = this.getTranslationModule();

      const contentString = typeof content === 'string' ? content : JSON.stringify(content);
      const liquidEngine = createLiquidEngine();

      const translatedContent = await translate.execute({
        resourceId,
        resourceType,
        organizationId,
        environmentId,
        userId: 'system',
        locale,
        content: contentString,
        payload: variables,
        liquidEngine,
        resourceEntity,
        organization,
      });

      return typeof content === 'string' ? translatedContent : JSON.parse(translatedContent);
    } catch (error) {
      this.logger.error({
        error: error?.message || error,
        resourceId,
        resourceType,
        organizationId,
        environmentId,
        locale,
        stack: error?.stack,
      }, 'Translation processing failed');

      throw new InternalServerErrorException(
        `Translation processing failed for resource ${resourceId}: ${error?.message || String(error)}`
      );
    }
  }

  private getTranslationModule() {
    try {
      const translationModule = require('@novu/ee-translation')?.Translate;
      if (!translationModule) {
        throw new Error('Translation module (@novu/ee-translation) not found or Translate class not exported');
      }

      return this.moduleRef.get(translationModule, { strict: false });
    } catch (error) {
      this.logger.error({
        error: error?.message || error,
        stack: error?.stack,
      }, 'Translation module loading failed');

      throw new InternalServerErrorException(`Unable to load Translation module: ${error?.message || String(error)}`);
    }
  }
}
