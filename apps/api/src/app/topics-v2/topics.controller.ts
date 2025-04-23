import { ClassSerializerInterceptor, Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExternalApiAccessible } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, UserSessionData } from '@novu/shared';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { DirectionEnum } from '../shared/dtos/base-responses';
import { ApiCommonResponses, ApiResponse } from '../shared/framework/response.decorator';
import { UserAuthentication } from '../shared/framework/swagger/api.key.security';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../shared/framework/user.decorator';
import { ListTopicsQueryDto } from './dtos/list-topics-query.dto';
import { ListTopicsResponseDto } from './dtos/list-topics-response.dto';
import { ListTopicsCommand } from './usecases/list-topics/list-topics.command';
import { ListTopicsUseCase } from './usecases/list-topics/list-topics.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller({ path: '/topics', version: '2' })
@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Topics')
@SdkGroupName('Topics')
@ApiCommonResponses()
export class TopicsController {
  constructor(private listTopicsUsecase: ListTopicsUseCase) {}

  @Get('')
  @UserAuthentication()
  @ExternalApiAccessible()
  @SdkMethodName('list')
  @ApiOperation({ summary: 'Get topics list' })
  @ApiResponse(ListTopicsResponseDto)
  async listTopics(
    @UserSession() user: UserSessionData,
    @Query() query: ListTopicsQueryDto
  ): Promise<ListTopicsResponseDto> {
    return await this.listTopicsUsecase.execute(
      ListTopicsCommand.create({
        user,
        limit: Number(query.limit || '10'),
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        orderBy: query.orderBy || '_id',
        key: query.key,
        name: query.name,
        includeCursor: query.includeCursor,
      })
    );
  }
}
