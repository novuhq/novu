import { Body, Controller, Post } from '@nestjs/common';
import { IEmailBlock, IJwtPayload, MessageTemplateContentType } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { ApiExcludeController } from '@nestjs/swagger';
import { CompileEmailTemplate } from './usecases/compile-email-template/compile-email-template.usecase';
import { CompileEmailTemplateCommand } from './usecases/compile-email-template/compile-email-template.command';

@Controller('/content-templates')
@ApiExcludeController()
export class ContentTemplatesController {
  constructor(private compileEmailTemplateUsecase: CompileEmailTemplate) {}

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
      })
    );
  }
}
