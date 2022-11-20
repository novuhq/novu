import { Controller, Delete, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RemoveMessage, RemoveMessageCommand } from './usecases/remove-message';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { ChannelTypeEnum, IJwtPayload } from '@novu/shared';
import { ApiTags, ApiOkResponse, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DeleteMessageResponseDto } from './dtos/delete-message-response.dto';
import { ActivitiesResponseDto } from '../notifications/dtos/activities-response.dto';
import { GetMessages, GetMessagesCommand } from './usecases/get-messages';
import { MessagesResponseDto } from '../widgets/dtos/message-response.dto';
import { DeleteMessageParams } from './params/delete-message.param';

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
  @ApiQuery({ name: 'page', type: Number, required: false, description: 'The page to fetch, defaults to 0' })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'The number of messages to fetch, defaults to 10',
  })
  @ApiQuery({
    name: 'subscriberId',
    type: String,
    required: false,
    description: 'The subscriberId for the subscriber you like to list messages for',
  })
  @ApiQuery({
    name: 'channel',
    enum: ChannelTypeEnum,
    required: false,
    description: 'The channel for the messages you wish to list',
  })
  async getMessages(
    @UserSession() user: IJwtPayload,
    @Query('page') page = 0,
    @Query('limit') limit = 10,
    @Query('subscriberId') subscriberId,
    @Query('channel') channel: ChannelTypeEnum
  ): Promise<MessagesResponseDto> {
    return await this.getMessagesUsecase.execute(
      GetMessagesCommand.create({
        organizationId: user.organizationId,
        environmentId: user.environmentId,
        page: page ? Number(page) : 0,
        channel,
        subscriberId,
        limit: limit ? Number(limit) : 10,
      })
    );
  }

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
