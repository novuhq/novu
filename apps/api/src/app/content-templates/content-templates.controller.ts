import { Body, Controller, Post } from '@nestjs/common';
import { IEmailBlock, IJwtPayload, MessageTemplateContentType } from '@novu/shared';
import { ApiExcludeController } from '@nestjs/swagger';
import { UserSession } from '../shared/framework/user.decorator';
import { PreviewEmail } from './usecases/parse-preview/preview-email.usecase';
import { PreviewEmailCommand } from './usecases/parse-preview/preview-email.command';

@Controller('/content-templates')
@ApiExcludeController()
export class ContentTemplatesController {
  constructor(private previewEmailUsecase: PreviewEmail) {}

  @Post('/preview/email')
  public previewEmail(
    @UserSession() user: IJwtPayload,
    @Body('content') content: string | IEmailBlock[],
    @Body('contentType') contentType: MessageTemplateContentType,
    @Body('payload') payload: any
  ) {
    return this.previewEmailUsecase.execute(
      PreviewEmailCommand.create({
        userId: user._id,
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        content,
        contentType,
        payload,
      })
    );
  }
}
