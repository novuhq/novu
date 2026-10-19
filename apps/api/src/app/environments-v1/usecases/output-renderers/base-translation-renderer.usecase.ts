import { InternalServerErrorException } from '@nestjs/common';
import { LayoutDto, PinoLogger } from '@novu/application-generic';
import { LocalizationResourceEnum, NotificationTemplateEntity, OrganizationEntity } from '@novu/dal';
import { JSONContent as MailyJSONContent } from '@novu/maily-render';
import { ControlsTranslationService } from './controls-translation.service';
import { FullPayloadForRender } from './render-command';

export type TranslationContext = {
  i18nInstance: unknown;
  liquidEngine: unknown;
  locale: string;
  resourceId: string;
};

export abstract class BaseTranslationRendererUsecase {
  constructor(
    protected logger: PinoLogger,
    protected controlsTranslationService: ControlsTranslationService
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
    return this.controlsTranslationService.processTranslations({
      controls,
      variables,
      environmentId,
      organizationId,
      resourceId,
      resourceType,
      locale,
      resourceEntity,
      organization,
    });
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
    return this.controlsTranslationService.processStringTranslations({
      content,
      variables,
      environmentId,
      organizationId,
      resourceId,
      resourceType,
      locale,
      organization,
    });
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
    return this.controlsTranslationService.createTranslationContext({
      environmentId,
      organizationId,
      resourceId,
      resourceType,
      locale,
      organization,
      resourceEntity,
    });
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
    return this.controlsTranslationService.processStringWithContext({
      context,
      content,
      variables,
    });
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
}
