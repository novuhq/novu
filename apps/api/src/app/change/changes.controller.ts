import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiRateLimitCostEnum, IJwtPayload } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { UserAuthGuard } from '../auth/framework/user.auth.guard';
import { ApplyChange, ApplyChangeCommand } from './usecases';
import { GetChanges } from './usecases/get-changes/get-changes.usecase';
import { GetChangesCommand } from './usecases/get-changes/get-changes.command';
import { BulkApplyChange } from './usecases/bulk-apply-change/bulk-apply-change.usecase';
import { BulkApplyChangeCommand } from './usecases/bulk-apply-change/bulk-apply-change.command';
import { CountChanges } from './usecases/count-changes/count-changes.usecase';
import { CountChangesCommand } from './usecases/count-changes/count-changes.command';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChangesResponseDto, ChangeResponseDto } from './dtos/change-response.dto';
import { ChangesRequestDto } from './dtos/change-request.dto';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiCommonResponses, ApiOkResponse, ApiResponse } from '../shared/framework/response.decorator';
import { DataNumberDto } from '../shared/dtos/data-wrapper-dto';
import { BulkApplyChangeDto } from './dtos/bulk-apply-change.dto';
import { ThrottlerCost } from '../rate-limiting/guards';

@ApiCommonResponses()
@Controller('/changes')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(UserAuthGuard)
@ApiTags('Changes')
export class ChangesController {
  constructor(
    private applyChange: ApplyChange,
    private getChangesUsecase: GetChanges,
    private bulkApplyChange: BulkApplyChange,
    private countChanges: CountChanges
  ) {}

  @Get('/')
  @ApiOkResponse({
    type: ChangesResponseDto,
  })
  @ApiOperation({
    summary: 'Get changes',
  })
  @ExternalApiAccessible()
  async getChanges(@UserSession() user: IJwtPayload, @Query() query: ChangesRequestDto): Promise<ChangesResponseDto> {
    return await this.getChangesUsecase.execute(
      GetChangesCommand.create({
        promoted: query.promoted === 'true',
        page: query.page ? query.page : 0,
        limit: query.limit ? query.limit : 10,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Get('/count')
  @ApiOkResponse({
    type: DataNumberDto,
  })
  @ApiOperation({
    summary: 'Get changes count',
  })
  @ExternalApiAccessible()
  async getChangesCount(@UserSession() user: IJwtPayload): Promise<number> {
    return await this.countChanges.execute(
      CountChangesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @ThrottlerCost(ApiRateLimitCostEnum.BULK)
  @Post('/bulk/apply')
  @ApiResponse(ChangeResponseDto, 201, true)
  @ApiOperation({
    summary: 'Apply changes',
  })
  @ExternalApiAccessible()
  async bulkApplyDiff(
    @UserSession() user: IJwtPayload,
    @Body() body: BulkApplyChangeDto
  ): Promise<ChangeResponseDto[][]> {
    return this.bulkApplyChange.execute(
      BulkApplyChangeCommand.create({
        changeIds: body.changeIds,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Post('/:changeId/apply')
  @ApiResponse(ChangeResponseDto, 201, true)
  @ApiOperation({
    summary: 'Apply change',
  })
  @ExternalApiAccessible()
  async applyDiff(@UserSession() user: IJwtPayload, @Param('changeId') changeId: string): Promise<ChangeResponseDto[]> {
    return this.applyChange.execute(
      ApplyChangeCommand.create({
        changeId: changeId,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }
}
