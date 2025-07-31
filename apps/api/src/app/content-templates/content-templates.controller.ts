import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  CompileEmailTemplate,
  CompileEmailTemplateCommand,
  CompileInAppTemplate,
  CompileInAppTemplateCommand,
  CompileStepTemplate,
  CompileStepTemplateCommand,
  PinoLogger,
} from '@novu/application-generic';
import { IEmailBlock, IMessageCTA, MessageTemplateContentType, UserSessionData } from '@novu/shared';
import { format } from 'date-fns';
import i18next from 'i18next';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { UserSession } from '../shared/framework/user.decorator';

@Controller('/content-templates')
@RequireAuthentication()
@ApiExcludeController()
export class ContentTemplatesController {
  constructor(
    private compileEmailTemplateUsecase: CompileEmailTemplate,
    private compileInAppTemplate: CompileInAppTemplate,
    private compileStepTemplate: CompileStepTemplate,
    private moduleRef: ModuleRef,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @Post('/preview/email')
  public async previewEmail(
    @UserSession() user: UserSessionData,
    @Body('content') content: string | IEmailBlock[],
    @Body('contentType') contentType: MessageTemplateContentType,
    @Body('payload') payload: any,
    @Body('subject') subject: string,
    @Body('layoutId') layoutId: string,
    @Body('locale') locale?: string
  ) {
    const i18nInstance = await this.initiateTranslations(user.environmentId, user.organizationId, locale);

    return this.compileEmailTemplateUsecase.execute(
      CompileEmailTemplateCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        content,
        contentType,
        payload,
        subject,
        layoutId,
        locale,
      }),
      i18nInstance
    );
  }

  @Post('/preview/in-app')
  public async previewInApp(
    @UserSession() user: UserSessionData,
    @Body('content') content: string,
    @Body('payload') payload: any,
    @Body('cta') cta: IMessageCTA,
    @Body('locale') locale?: string
  ) {
    const i18nInstance = await this.initiateTranslations(user.environmentId, user.organizationId, locale);

    return this.compileInAppTemplate.execute(
      CompileInAppTemplateCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        content,
        payload,
        cta,
        locale,
      }),
      i18nInstance
    );
  }
  // TODO: refactor this to use params and single endpoint to manage all the channels
  @Post('/preview/sms')
  public async previewSms(
    @UserSession() user: UserSessionData,
    @Body('content') content: string,
    @Body('payload') payload: any,
    @Body('locale') locale?: string
  ) {
    const i18nInstance = await this.initiateTranslations(user.environmentId, user.organizationId, locale);

    return this.compileStepTemplate.execute(
      CompileStepTemplateCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        content,
        payload,
        locale,
      }),
      i18nInstance
    );
  }

  @Post('/preview/chat')
  public async previewChat(
    @UserSession() user: UserSessionData,
    @Body('content') content: string,
    @Body('payload') payload: any,
    @Body('locale') locale?: string
  ) {
    const i18nInstance = await this.initiateTranslations(user.environmentId, user.organizationId, locale);

    return this.compileStepTemplate.execute(
      CompileStepTemplateCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        content,
        payload,
        locale,
      }),
      i18nInstance
    );
  }

  @Post('/preview/push')
  public async previewPush(
    @UserSession() user: UserSessionData,
    @Body('content') content: string,
    @Body('title') title: string,
    @Body('payload') payload: any,
    @Body('locale') locale?: string
  ) {
    const i18nInstance = await this.initiateTranslations(user.environmentId, user.organizationId, locale);

    return this.compileStepTemplate.execute(
      CompileStepTemplateCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        content,
        payload,
        locale,
        title,
      }),
      i18nInstance
    );
  }

  protected async initiateTranslations(environmentId: string, organizationId: string, locale: string | undefined) {
    try {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        if (!require('@novu/ee-shared-services')?.TranslationsService) {
          throw new BadRequestException('Translation module is not loaded');
        }
        const service = this.moduleRef.get(require('@novu/ee-shared-services')?.TranslationsService, { strict: false });
        const { namespaces, resources, defaultLocale } = await service.getTranslationsList(
          environmentId,
          organizationId
        );
        const instance = i18next.createInstance();
        await instance.init({
          resources,
          ns: namespaces,
          defaultNS: false,
          nsSeparator: '.',
          lng: locale || 'en',
          compatibilityJSON: 'v2',
          fallbackLng: defaultLocale,
          interpolation: {
            formatSeparator: ',',
            format(value, formatting, lng) {
              if (value && formatting && !Number.isNaN(Date.parse(value))) {
                return format(new Date(value), formatting);
              }

              return value.toString();
            },
          },
        });

        return instance;
      }
    } catch (e) {
      this.logger.error({ err: e }, `Unexpected error while importing enterprise modules`);
    }
  }
}
