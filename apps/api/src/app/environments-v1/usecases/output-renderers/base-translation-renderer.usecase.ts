import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { createLiquidEngine } from '@novu/framework/internal';
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
    dbWorkflow,
  }: {
    controls: Record<string, unknown>;
    variables: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    workflowId?: string;
    locale?: string;
    dbWorkflow?: NotificationTemplateEntity;
  }): Promise<Record<string, unknown>> {
    if (process.env.NOVU_ENTERPRISE !== 'true') {
      return controls;
    }

    return this.executeTranslation({
      content: controls,
      variables,
      environmentId,
      organizationId,
      workflowId,
      locale,
      dbWorkflow,
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
    if (process.env.NOVU_ENTERPRISE !== 'true') {
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

  private async executeTranslation({
    content,
    variables,
    environmentId,
    organizationId,
    workflowId,
    locale,
    dbWorkflow,
  }: {
    content: string | Record<string, unknown>;
    variables: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    workflowId?: string;
    locale?: string;
    dbWorkflow?: NotificationTemplateEntity;
  }): Promise<string | Record<string, unknown>> {
    if (!workflowId) {
      this.logger.error('Workflow ID is required for translation module', {
        workflowId,
        organizationId,
        environmentId,
        locale,
      });

      throw new Error('Workflow ID is required for translation module');
    }

    try {
      const translate = this.getTranslationModule();

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
        dbWorkflow,
      });

      return typeof content === 'string' ? translatedContent : JSON.parse(translatedContent);
    } catch (error) {
      this.logger.error('Translation processing failed', {
        error: error?.message || error,
        workflowId,
        organizationId,
        environmentId,
        locale,
        stack: error?.stack,
      });

      throw new InternalServerErrorException(
        `Translation processing failed for workflow ${workflowId}: ${error?.message || String(error)}`
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
      this.logger.error('Translation module loading failed', {
        error: error?.message || error,
        stack: error?.stack,
      });

      throw new InternalServerErrorException(`Unable to load Translation module: ${error?.message || String(error)}`);
    }
  }
}
