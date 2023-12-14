import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { RemoveMessage, RemoveMessageCommand } from './usecases/remove-message';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { IJwtPayload } from '@novu/shared';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { DeleteMessageResponseDto } from './dtos/delete-message-response.dto';
import { ActivitiesResponseDto } from '../notifications/dtos/activities-response.dto';
import { GetMessages, GetMessagesCommand } from './usecases/get-messages';
import { MessagesResponseDto } from '../widgets/dtos/message-response.dto';
import { DeleteMessageParams } from './params/delete-message.param';
import {
  ApiCommonResponses,
  ApiResponse,
  ApiNoContentResponse,
  ApiOkResponse,
} from '../shared/framework/response.decorator';
import { GetMessagesRequestDto } from './dtos/get-messages-requests.dto';
import { RemoveMessagesByTransactionId } from './usecases/remove-messages-by-transactionId/remove-messages-by-transactionId.usecase';
import { RemoveMessagesByTransactionIdCommand } from './usecases/remove-messages-by-transactionId/remove-messages-by-transactionId.command';
import { DeleteMessageByTransactionIdRequestDto } from './dtos/remove-messages-by-transactionId-request.dto';

@ApiCommonResponses()
@Controller('/messages')
@ApiTags('Messages')
export class MessagesController {
  constructor(
    private removeMessage: RemoveMessage,
    private getMessagesUsecase: GetMessages,
    private removeMessagesByTransactionId: RemoveMessagesByTransactionId
  ) {}

  @Get('')
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
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
  @UseGuards(UserAuthGuard)
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

  @Delete('/transaction/:transactionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ExternalApiAccessible()
  @UseGuards(UserAuthGuard)
  @ApiNoContentResponse()
  @ApiOperation({
    summary: 'Delete messages by transactionId',
    description: 'Deletes messages entity from the Novu platform using TransactionId of message',
  })
  @ApiParam({ name: 'transactionId', type: String, required: true })
  async deleteMessagesByTransactionId(
    @UserSession() user: IJwtPayload,
    @Param() { transactionId }: { transactionId: string },
    @Query() query: DeleteMessageByTransactionIdRequestDto
  ) {
    return await this.removeMessagesByTransactionId.execute(
      RemoveMessagesByTransactionIdCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        transactionId: transactionId,
        channel: query.channel,
      })
    );
  }
}
