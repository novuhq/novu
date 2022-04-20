import { ClassSerializerInterceptor, Controller, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { ChangeEntity } from '@novu/dal';
import { UserSession } from '../shared/framework/user.decorator';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { ApplyChange } from '../change/usecases/apply-change/apply-change.usecase';
import { ApplyChangeCommand } from '../change/usecases/apply-change/apply-change.command';

@Controller('/changes')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class ChangesController {
  constructor(private applyChange: ApplyChange) {}

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
