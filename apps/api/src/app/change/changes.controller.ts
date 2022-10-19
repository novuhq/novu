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
import { IJwtPayload } from '@novu/shared';
import { UserSession } from '../shared/framework/user.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ApplyChange } from '../change/usecases/apply-change/apply-change.usecase';
import { ApplyChangeCommand } from '../change/usecases/apply-change/apply-change.command';
import { GetChanges } from './usecases/get-changes/get-changes.usecase';
import { GetChangesCommand } from './usecases/get-changes/get-changes.command';
import { BulkApplyChange } from './usecases/bulk-apply-change/bulk-apply-change.usecase';
import { BulkApplyChangeCommand } from './usecases/bulk-apply-change/bulk-apply-change.command';
import { CountChanges } from './usecases/count-changes/count-changes.usecase';
import { CountChangesCommand } from './usecases/count-changes/count-changes.command';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChangesResponseDto, ChangeResponseDto } from './dtos/change-response.dto';
import { ChangesRequestDto } from './dtos/change-request.dto';

import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';

@Controller('/changes')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
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
        page: query.page ? Number(query.page) : 0,
        limit: query.limit ? Number(query.limit) : 10,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Get('/count')
  @ApiOkResponse({
    type: Number,
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

  @Post('/bulk/apply')
  @ApiCreatedResponse({
    type: [ChangeResponseDto],
  })
  @ApiOperation({
    summary: 'Apply changes',
  })
  @ExternalApiAccessible()
  async bulkApplyDiff(
    @UserSession() user: IJwtPayload,
    @Body('changeIds') changeIds: string[]
  ): Promise<ChangeResponseDto[]> {
    return this.bulkApplyChange.execute(
      BulkApplyChangeCommand.create({
        changeIds,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Post('/:changeId/apply')
  @ApiCreatedResponse({
    type: [ChangeResponseDto],
  })
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
