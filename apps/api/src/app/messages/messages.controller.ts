import { Controller, Delete, Get, HttpCode, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import {
  ApiCommonResponses,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiResponse,
} from '../shared/framework/response.decorator';
import { SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../shared/framework/user.decorator';
import { MessagesResponseDto } from '../widgets/dtos/message-response.dto';
import { DeleteMessageResponseDto } from './dtos/delete-message-response.dto';
import { GetMessagesRequestDto } from './dtos/get-messages-requests.dto';
import { DeleteMessageByTransactionIdRequestDto } from './dtos/remove-messages-by-transactionId-request.dto';
import { DeleteMessageParams } from './params/delete-message.param';
import { GetMessages, GetMessagesCommand } from './usecases/get-messages';
import { RemoveMessage, RemoveMessageCommand } from './usecases/remove-message';
import { RemoveMessagesByTransactionIdCommand } from './usecases/remove-messages-by-transactionId/remove-messages-by-transactionId.command';
import { RemoveMessagesByTransactionId } from './usecases/remove-messages-by-transactionId/remove-messages-by-transactionId.usecase';

@ApiCommonResponses()
@RequireAuthentication()
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
  @ApiOkResponse({
    type: MessagesResponseDto,
  })
  @ApiOperation({
    summary: 'List all messages',
    description: `List all messages for the current environment. 
    This API supports filtering by **channel**, **subscriberId**, and **transactionId**. 
    This API returns a paginated list of messages.`,
  })
  @RequirePermissions(PermissionsEnum.MESSAGE_READ)
  async getMessages(
    @UserSession() user: UserSessionData,
    @Query() query: GetMessagesRequestDto
  ): Promise<MessagesResponseDto> {
    let transactionIdQuery: string[] | undefined;
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
  @ApiResponse(DeleteMessageResponseDto)
  @ApiOperation({
    summary: 'Delete a message',
    description: `Delete a message entity from the Novu platform by **messageId**. 
    This action is irreversible. **messageId** is required and of mongodbId type.`,
  })
  @ApiParam({ name: 'messageId', type: String, required: true, example: '507f1f77bcf86cd799439011' })
  @RequirePermissions(PermissionsEnum.MESSAGE_WRITE)
  async deleteMessage(
    @UserSession() user: UserSessionData,
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
  @ApiNoContentResponse()
  @ApiOperation({
    summary: 'Delete messages by transactionId',
    description: `Delete multiple messages from the Novu platform using **transactionId** of triggered event. 
    This API supports filtering by **channel** and delete all messages associated with the **transactionId**.`,
  })
  @ApiParam({ name: 'transactionId', type: String, required: true, example: '507f1f77bcf86cd799439011' })
  @SdkMethodName('deleteByTransactionId')
  @RequirePermissions(PermissionsEnum.MESSAGE_WRITE)
  async deleteMessagesByTransactionId(
    @UserSession() user: UserSessionData,
    @Param() { transactionId }: { transactionId: string },
    @Query() query: DeleteMessageByTransactionIdRequestDto
  ) {
    return await this.removeMessagesByTransactionId.execute(
      RemoveMessagesByTransactionIdCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        transactionId,
        channel: query.channel,
      })
    );
  }
}
