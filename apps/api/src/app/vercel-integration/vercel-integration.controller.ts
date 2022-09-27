import { Controller, Get, Param, UseInterceptors, UseGuards, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IJwtPayload, MemberRoleEnum } from '@novu/shared';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UserSession } from '../shared/framework/user.decorator';
import { SetupIntegrationCommand } from './usecases/setup-integration/setup-integration.command';
import { SetupIntegration } from './usecases/setup-integration/setup-integration.usecase';

@Controller('/vercel-integration')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Integrations')
export class VercelIntegrationController {
  constructor(private setupIntegrationUsecase: SetupIntegration) {}

  @Get('/:code')
  async setupIntegration(@UserSession() user: IJwtPayload, @Param('code') code: string) {
    return await this.setupIntegrationUsecase.execute(
      SetupIntegrationCommand.create({
        code,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }
}
