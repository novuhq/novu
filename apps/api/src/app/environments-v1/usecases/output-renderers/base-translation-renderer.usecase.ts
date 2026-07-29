import { LayoutDto, PinoLogger } from '@novu/application-generic';
import { LocalizationResourceEnum, NotificationTemplateEntity, OrganizationEntity } from '@novu/dal';
import { ControlsTranslationService } from './controls-translation.service';
import { FullPayloadForRender } from './render-command';

type TranslationContext = {
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
}
