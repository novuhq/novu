import { Body, Controller, Post } from '@nestjs/common';
import { PreviewEmail } from './usecases/parse-preview/preview-email.usecase';
import { PreviewEmailCommand } from './usecases/parse-preview/preview-email.command';
import { IEmailBlock, IJwtPayload, MessageTemplateContentType } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller('/content-templates')
@ApiExcludeController()
export class ContentTemplatesController {
  constructor(private previewEmailUsecase: PreviewEmail) {}

  @Post('/preview/email')
  public previewEmail(
    @UserSession() user: IJwtPayload,
    @Body('content') content: string | IEmailBlock[],
    @Body('contentType') contentType: MessageTemplateContentType,
    @Body('payload') payload: any,
    @Body('subject') subject: string
  ) {
    return this.previewEmailUsecase.execute(
      PreviewEmailCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        content,
        contentType,
        payload,
        subject,
      })
    );
  }
}
