import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  ApiException,
  CompileEmailTemplate,
  CompileEmailTemplateCommand,
  CompileInAppTemplate,
  CompileInAppTemplateCommand,
  UserAuthGuard,
} from '@novu/application-generic';
import * as i18next from 'i18next';
import { ModuleRef } from '@nestjs/core';
import { IEmailBlock, IJwtPayload, MessageTemplateContentType, IMessageCTA } from '@novu/shared';

import { UserSession } from '../shared/framework/user.decorator';

@Controller('/content-templates')
@UseGuards(UserAuthGuard)
@ApiExcludeController()
export class ContentTemplatesController {
  constructor(
    private compileEmailTemplateUsecase: CompileEmailTemplate,
    private compileInAppTemplate: CompileInAppTemplate,
    private moduleRef: ModuleRef
  ) {}

  @Post('/preview/email')
  public previewEmail(
    @UserSession() user: IJwtPayload,
    @Body('content') content: string | IEmailBlock[],
    @Body('contentType') contentType: MessageTemplateContentType,
    @Body('payload') payload: any,
    @Body('subject') subject: string,
    @Body('layoutId') layoutId: string
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
      }),
      this.initiateTranslations.bind(this)
    );
  }

  @Post('/preview/in-app')
  public previewInApp(
    @UserSession() user: IJwtPayload,
    @Body('content') content: string,
    @Body('payload') payload: any,
    @Body('cta') cta: IMessageCTA
  ) {
    return this.compileInAppTemplate.execute(
      CompileInAppTemplateCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        content,
        payload,
        cta,
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
        const { namespaces, resources } = await service.getTranslationsList(environmentId, organizationId);

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
      Logger.error(e, `Unexpected error while importing enterprise modules`, 'TranslationsService');
    }
  }
}
