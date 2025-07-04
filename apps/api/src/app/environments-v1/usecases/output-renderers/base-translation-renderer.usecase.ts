import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { createLiquidEngine } from '@novu/framework/internal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { FullPayloadForRender } from './render-command';

@Injectable()
export abstract class BaseTranslationRendererUsecase {
  constructor(
    protected moduleRef: ModuleRef,
    protected logger: PinoLogger,
    protected featureFlagsService: FeatureFlagsService
  ) {}

  protected async processTranslations({
    controls,
    variables,
    environmentId,
    organizationId,
    workflowId,
    locale,
  }: {
    controls: Record<string, unknown>;
    variables: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    workflowId?: string;
    locale?: string;
  }): Promise<Record<string, unknown>> {
    const isTranslationEnabled = await this.isTranslationFeatureEnabled(organizationId);

    if (!isTranslationEnabled) {
      return controls;
    }

    return this.executeTranslation({
      content: controls,
      variables,
      environmentId,
      organizationId,
      workflowId,
      locale,
    }) as Promise<Record<string, unknown>>;
  }

  protected async processStringTranslations({
    content,
    variables,
    environmentId,
    organizationId,
    workflowId,
    locale,
  }: {
    content: string;
    variables: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    workflowId?: string;
    locale?: string;
  }): Promise<string> {
    const isTranslationEnabled = await this.isTranslationFeatureEnabled(organizationId);

    if (!isTranslationEnabled) {
      return content;
    }

    return this.executeTranslation({
      content,
      variables,
      environmentId,
      organizationId,
      workflowId,
      locale,
    }) as Promise<string>;
  }

  private async isTranslationFeatureEnabled(organizationId: string): Promise<boolean> {
    return await this.featureFlagsService.getFlag({
      organization: { _id: organizationId },
      key: FeatureFlagsKeysEnum.IS_TRANSLATION_ENABLED,
      defaultValue: false,
    });
  }

  private async executeTranslation({
    content,
    variables,
    environmentId,
    organizationId,
    workflowId,
    locale,
  }: {
    content: string | Record<string, unknown>;
    variables: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    workflowId?: string;
    locale?: string;
  }): Promise<string | Record<string, unknown>> {
    if (!workflowId) {
      return content;
    }

    try {
      const translate = this.getTranslationModule();

      if (!translate) {
        this.logger.debug('Translation module not available, skipping translation');

        return content;
      }

      const contentString = typeof content === 'string' ? content : JSON.stringify(content);
      const liquidEngine = createLiquidEngine();

      const translatedContent = await translate.execute({
        workflowIdOrInternalId: workflowId,
        organizationId,
        environmentId,
        userId: 'system',
        locale,
        content: contentString,
        payload: variables,
        liquidEngine,
      });

      return typeof content === 'string' ? translatedContent : JSON.parse(translatedContent);
    } catch (error) {
      this.logger.error('Translation processing failed, falling back to original content', error);

      return content;
    }
  }

  private getTranslationModule() {
    try {
      // eslint-disable-next-line global-require
      return this.moduleRef.get(require('@novu/ee-translation')?.Translate, { strict: false });
    } catch (error) {
      this.logger.debug('Translation module not found', error);

      return null;
    }
  }
}
