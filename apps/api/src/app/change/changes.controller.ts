import {
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

@Controller('/changes')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class ChangesController {
  constructor(private applyChange: ApplyChange, private getChangesUsecase: GetChanges) {}

  @Get('/')
  async getChanges(@UserSession() user: IJwtPayload, @Query('promoted') promoted = 'false'): Promise<ChangeEntity[]> {
    try {
      return await this.getChangesUsecase.execute(
        GetChangesCommand.create({
          promoted: promoted === 'true',
          environmentId: user.environmentId,
          organizationId: user.organizationId,
          userId: user._id,
        })
      );
    } catch (e) {
      console.log(e);
    }
  }

  @Post('/:changeId/apply')
  async applyDiff(@UserSession() user: IJwtPayload, @Param('changeId') changeId: string): Promise<ChangeEntity> {
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
