import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RemoveMessage, RemoveMessageCommand } from './usecases/remove-message';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { IJwtPayload } from '@novu/shared';
import { ApiTags, ApiOkResponse, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { DeleteMessageResponseDto } from './dtos/delete-message-response.dto';
import { ActivitiesResponseDto } from '../notifications/dtos/activities-response.dto';
import { GetMessages, GetMessagesCommand } from './usecases/get-messages';
import { MessagesResponseDto } from '../widgets/dtos/message-response.dto';
import { DeleteMessageParams } from './params/delete-message.param';
import { ApiResponse } from '../shared/framework/response.decorator';
import { GetMessagesRequestDto } from './dtos/get-messages-requests.dto';

@Controller('/messages')
@ApiTags('Messages')
export class MessagesController {
  constructor(private removeMessage: RemoveMessage, private getMessagesUsecase: GetMessages) {}

  @Get('')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    type: ActivitiesResponseDto,
  })
  @ApiOperation({
    summary: 'Get messages',
    description: 'Returns a list of messages, could paginate using the `page` query parameter',
  })
  async getMessages(
    @UserSession() user: IJwtPayload,
    @Query() query: GetMessagesRequestDto
  ): Promise<MessagesResponseDto> {
    let transactionIdQuery: string[] | undefined = undefined;
    if (query.transactionId) {
      transactionIdQuery = Array.isArray(query.transactionId) ? query.transactionId : [query.transactionId];
    }

    return await this.getMessagesUsecase.execute(
      GetMessagesCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        channel: query.channel,
        subscriberId: query.subscriberId,
        page: query.page ? Number(query.page) : 0,
        limit: query.limit ? Number(query.limit) : 10,
        transactionIds: transactionIdQuery,
      })
    );
  }

  @Delete('/:messageId')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiResponse(DeleteMessageResponseDto)
  @ApiOperation({
    summary: 'Delete message',
    description: 'Deletes a message entity from the Novu platform',
  })
  @ApiParam({ name: 'messageId', type: String, required: true })
  async deleteMessage(
    @UserSession() user: IJwtPayload,
    @Param() { messageId }: DeleteMessageParams
  ): Promise<DeleteMessageResponseDto> {
    return await this.removeMessage.execute(
      RemoveMessageCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        messageId,
      })
    );
  }

  @Delete('/:messageId')
  @ExternalApiAccessible()
  @UseGuards(JwtAuthGuard)
  @ApiResponse(DeleteMessageResponseDto)
  @ApiOperation({
    summary: 'Delete message',
    description: 'Deletes a message entity from the Novu platform',
  })
  @ApiParam({ name: 'messageId', type: String, required: true })
  async deleteMessagesByTransactionId(
    @UserSession() user: IJwtPayload,
    @Param() { messageId }: DeleteMessageParams
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
