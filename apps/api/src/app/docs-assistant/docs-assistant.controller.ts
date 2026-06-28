import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipPermissionsCheck, UserSession } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import type { Response } from 'express';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { DocsAssistantMessageRequestDto } from './dtos/docs-assistant-message-request.dto';
import { DocsAssistantSearchRequestDto } from './dtos/docs-assistant-search-request.dto';
import { SearchDocsCommand, SearchDocsUsecase } from './usecases/search-docs';
import { SendDocsMessageCommand, SendDocsMessageUsecase } from './usecases/send-docs-message';

@Controller('/docs-assistant')
@ApiExcludeController()
@RequireAuthentication()
export class DocsAssistantController {
  constructor(
    private searchDocsUsecase: SearchDocsUsecase,
    private sendDocsMessageUsecase: SendDocsMessageUsecase
  ) {}

  @Post('/search')
  @SkipPermissionsCheck()
  async search(@Body() body: DocsAssistantSearchRequestDto, @UserSession() user: UserSessionData) {
    return this.searchDocsUsecase.execute(
      SearchDocsCommand.create({
        query: body.query,
        pageSize: body.pageSize,
        userId: user._id as string,
      })
    );
  }

  @Post('/message')
  @SkipPermissionsCheck()
  async message(
    @Body() body: DocsAssistantMessageRequestDto,
    @UserSession() user: UserSessionData,
    @Res() res: Response
  ): Promise<void> {
    const result = await this.sendDocsMessageUsecase.execute(
      SendDocsMessageCommand.create({
        fp: user._id as string,
        threadId: body.threadId,
        threadKey: body.threadKey,
        messages: body.messages,
        retrievalPageSize: body.retrievalPageSize,
        currentPath: body.currentPath,
        userId: user._id as string,
      }),
      res
    );

    if (result.handled) {
      return;
    }

    res.json(result.body);
  }
}
