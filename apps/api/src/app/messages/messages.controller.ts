import { Controller, Delete, Param, UseGuards } from '@nestjs/common';
import { RemoveMessage, RemoveMessageCommand } from './usecases/remove-message';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { IJwtPayload } from '@novu/shared';
import { ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { DeleteMessageResponseDto } from './dtos/delete-message-response.dto';

@Controller('/messages')
@ApiTags('Messages')
export class MessagesController {
  constructor(private removeMessage: RemoveMessage) {}

  @Delete('/:messageId')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    type: DeleteMessageResponseDto,
  })
  @ApiOperation({
    summary: 'Delete message',
    description: 'Deletes a message entity from the Novu platform',
  })
  async deleteMessage(
    @UserSession() user: IJwtPayload,
    @Param('messageId') messageId: string
  ): Promise<DeleteMessageResponseDto> {
    return await this.removeMessage.execute(
      RemoveMessageCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        messageId,
      })
    );
  }
}
