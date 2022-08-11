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
import { ChangeEntity } from '@novu/dal';
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
import { ApiExcludeController, ApiTags } from '@nestjs/swagger';

@Controller('/changes')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Changes')
@ApiExcludeController()
export class ChangesController {
  constructor(
    private applyChange: ApplyChange,
    private getChangesUsecase: GetChanges,
    private bulkApplyChange: BulkApplyChange,
    private countChanges: CountChanges
  ) {}

  @Get('/')
  async getChanges(@UserSession() user: IJwtPayload, @Query('promoted') promoted = 'false'): Promise<ChangeEntity[]> {
    return await this.getChangesUsecase.execute(
      GetChangesCommand.create({
        promoted: promoted === 'true',
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Get('/count')
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
  async bulkApplyDiff(@UserSession() user: IJwtPayload, @Body() changeIds: string[]): Promise<ChangeEntity[]> {
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
  async applyDiff(@UserSession() user: IJwtPayload, @Param('changeId') changeId: string): Promise<ChangeEntity[]> {
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
