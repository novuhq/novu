import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { LayoutDto, PinoLogger } from '@novu/application-generic';
import { LocalizationResourceEnum, NotificationTemplateEntity, OrganizationEntity } from '@novu/dal';
import { createLiquidEngine } from '@novu/framework/internal';
import { JSONContent as MailyJSONContent } from '@novu/maily-render';
import { FullPayloadForRender } from './render-command';

export type TranslationContext = {
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
        this.logger.error(
          {
            error: errorMessage,
            resourceId,
            resourceType,
            organizationId,
            environmentId,
            locale,
            stack: error?.stack,
          },
          'Unexpected error during translation context creation'
        );
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
      this.logger.error(
        {
          error: error?.message || error,
          resourceId: context.resourceId,
          locale: context.locale,
          stack: error?.stack,
        },
        'Translation with context failed'
      );

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
      this.logger.warn(
        {
          resourceId,
          resourceType,
          organizationId,
          environmentId,
          locale,
        },
        'Resource ID is required for translation module'
      );

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
      this.logger.error(
        {
          error: error?.message || error,
          resourceId,
          resourceType,
          organizationId,
          environmentId,
          locale,
          stack: error?.stack,
        },
        'Translation processing failed'
      );

      throw new InternalServerErrorException(
        `Translation processing failed for resource ${resourceId}: ${error?.message || String(error)}`
      );
    }
  }

  /**
   * Escapes every string in the payload so it can be safely liquid-rendered into a stringified
   * Maily JSON document and re-parsed with `JSON.parse`. Without this, a payload value containing
   * a quote, backslash, newline or tab produces invalid JSON. Backslashes are escaped first, so
   * literal sequences (e.g. `C:\node`) and real newlines round-trip correctly through `JSON.parse`.
   */
  protected deepEscapePayloadStrings(payload: FullPayloadForRender): FullPayloadForRender {
    return this.deepEscapeObject(payload) as FullPayloadForRender;
  }

  private deepEscapeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.escapeStringForJson(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepEscapeObject(item));
    }

    if (typeof obj === 'object') {
      const escapedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        escapedObj[key] = this.deepEscapeObject(value);
      }

      return escapedObj;
    }

    return obj;
  }

  protected escapeStringForJson(str: string): string {
    return str
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/"/g, '\\"') // Escape quotes
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs
  }

  protected unescapeJsonString(str: string): string {
    return str
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');
  }

  protected deepUnescapeTranslationStrings(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.unescapeJsonString(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepUnescapeTranslationStrings(item));
    }

    if (typeof obj === 'object') {
      const unescapedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        unescapedObj[key] = this.deepUnescapeTranslationStrings(value);
      }

      return unescapedObj;
    }

    return obj;
  }

  /**
   * Resolves translation keys inside a (liquid-wrapped) Maily document. The document is
   * stringified, run through the translation module (which resolves `{t.key}` nodes), and
   * re-parsed. In non-enterprise builds the translation calls are no-ops, so the document
   * round-trips unchanged.
   */
  protected async processMailyTranslations({
    mailyContent,
    variables,
    environmentId,
    organizationId,
    resourceId,
    resourceType,
    locale,
    organization,
    translationContext,
  }: {
    mailyContent: MailyJSONContent;
    variables: FullPayloadForRender;
    environmentId: string;
    organizationId: string;
    resourceId?: string;
    resourceType?: LocalizationResourceEnum;
    locale?: string;
    organization?: OrganizationEntity;
    translationContext?: TranslationContext | null;
  }): Promise<MailyJSONContent> {
    const contentString = JSON.stringify(mailyContent);
    const translatedContent = translationContext
      ? await this.processStringWithContext({
          context: translationContext,
          content: contentString,
          variables,
        })
      : await this.processStringTranslations({
          content: contentString,
          variables,
          environmentId,
          organizationId,
          resourceId,
          resourceType,
          locale,
          organization,
        });

    try {
      return JSON.parse(translatedContent);
    } catch (error) {
      throw new InternalServerErrorException(
        `Translated Maily content is not valid JSON: ${error instanceof Error ? error.message : String(error)}`
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
      this.logger.error(
        {
          error: error?.message || error,
          stack: error?.stack,
        },
        'Translation module loading failed'
      );

      throw new InternalServerErrorException(`Unable to load Translation module: ${error?.message || String(error)}`);
    }
  }
}
