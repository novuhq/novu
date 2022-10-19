import { Controller, Post, Param, UseInterceptors, UseGuards, ClassSerializerInterceptor, Body } from '@nestjs/common';
import { IJwtPayload } from '@novu/shared';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UserSession } from '../shared/framework/user.decorator';
import { SetupVercelIntegrationRequestDto } from './dtos/setup-vercel-integration-request.dto';
import { SetupVercelIntegrationResponseDto } from './dtos/setup-vercel-integration-response.dto';
import { SetupVercelIntegrationCommand } from './usecases/setup-vercel-integration/setup-vercel-integration.command';
import { SetupVercelIntegration } from './usecases/setup-vercel-integration/setup-vercel-integration.usecase';

@Controller('/partner-integrations')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class PartnerIntegrationsController {
  constructor(private setupIntegrationUsecase: SetupVercelIntegration) {}

  @Post('/vercel')
  async setupVercelIntegration(
    @UserSession() user: IJwtPayload,
    @Body() body: SetupVercelIntegrationRequestDto
  ): Promise<SetupVercelIntegrationResponseDto> {
    return await this.setupIntegrationUsecase.execute(
      SetupVercelIntegrationCommand.create({
        vercelIntegrationCode: body.vercelIntegrationCode,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }
}
