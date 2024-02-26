import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { format } from 'date-fns';
import * as i18next from 'i18next';
import { ModuleRef } from '@nestjs/core';
import {
  ApiException,
  CompileEmailTemplate,
  CompileEmailTemplateCommand,
  CompileInAppTemplate,
  CompileInAppTemplateCommand,
  CompileStepTemplate,
  CompileStepTemplateCommand,
  UserAuthGuard,
} from '@novu/application-generic';
import { IEmailBlock, IJwtPayload, MessageTemplateContentType, IMessageCTA } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';

@Controller('/content-templates')
@UseGuards(UserAuthGuard)
@ApiExcludeController()
export class ContentTemplatesController {
  constructor(
    private compileEmailTemplateUsecase: CompileEmailTemplate,
    private compileInAppTemplate: CompileInAppTemplate,
    private compileStepTemplate: CompileStepTemplate,
    private moduleRef: ModuleRef
  ) {}

  @Post('/preview/email')
  public previewEmail(
    @UserSession() user: IJwtPayload,
    @Body('content') content: string | IEmailBlock[],
    @Body('contentType') contentType: MessageTemplateContentType,
    @Body('payload') payload: any,
    @Body('subject') subject: string,
    @Body('layoutId') layoutId: string,
    @Body('locale') locale?: string
  ) {
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
      this.initiateTranslations.bind(this)
    );
  }

  @Post('/preview/in-app')
  public previewInApp(
    @UserSession() user: IJwtPayload,
    @Body('content') content: string,
    @Body('payload') payload: any,
    @Body('cta') cta: IMessageCTA,
    @Body('locale') locale?: string
  ) {
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
      this.initiateTranslations.bind(this)
    );
  }
  // TODO: refactor this to use params and single endpoint to manage all the channels
  @Post('/preview/sms')
  public previewSms(
    @UserSession() user: IJwtPayload,
    @Body('content') content: string,
    @Body('payload') payload: any,
    @Body('locale') locale?: string
  ) {
    return this.compileStepTemplate.execute(
      CompileStepTemplateCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        content,
        payload,
        locale,
      }),
      this.initiateTranslations.bind(this)
    );
  }

  @Post('/preview/chat')
  public previewChat(
    @UserSession() user: IJwtPayload,
    @Body('content') content: string,
    @Body('payload') payload: any,
    @Body('locale') locale?: string
  ) {
    return this.compileStepTemplate.execute(
      CompileStepTemplateCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        content,
        payload,
        locale,
      }),
      this.initiateTranslations.bind(this)
    );
  }

  @Post('/preview/push')
  public previewPush(
    @UserSession() user: IJwtPayload,
    @Body('content') content: string,
    @Body('title') title: string,
    @Body('payload') payload: any,
    @Body('locale') locale?: string
  ) {
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
      this.initiateTranslations.bind(this)
    );
  }

  protected async initiateTranslations(environmentId: string, organizationId: string, locale: string | undefined) {
    try {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        if (!require('@novu/ee-translation')?.TranslationsService) {
          throw new ApiException('Translation module is not loaded');
        }
        const service = this.moduleRef.get(require('@novu/ee-translation')?.TranslationsService, { strict: false });
        const { namespaces, resources, defaultLocale } = await service.getTranslationsList(
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
          fallbackLng: defaultLocale,
          interpolation: {
            formatSeparator: ',',
            format: function (value, formatting, lng) {
              if (value && formatting && !isNaN(Date.parse(value))) {
                return format(new Date(value), formatting);
              }

              return value.toString();
            },
          },
        });
      }
    } catch (e) {
      Logger.error(e, `Unexpected error while importing enterprise modules`, 'TranslationsService');
    }
  }
}
