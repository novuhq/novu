import { Controller, Post, Param, UseInterceptors, UseGuards, ClassSerializerInterceptor, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '@novu/shared';
import { JwtAuthGuard } from '../auth/framework/auth.guard';
import { UserSession } from '../shared/framework/user.decorator';
import { SetupIntegrationRequestDto } from './dtos/setup-integration-request.dto';
import { SetupIntegrationResponseDto } from './dtos/setup-integration-response.dto';
import { SetupIntegrationCommand } from './usecases/setup-integration/setup-integration.command';
import { SetupIntegration } from './usecases/setup-integration/setup-integration.usecase';

@Controller('/vercel-integration')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
@ApiTags('Integrations')
export class VercelIntegrationController {
  constructor(private setupIntegrationUsecase: SetupIntegration) {}

  @Post('/setup')
  async setupIntegration(
    @UserSession() user: IJwtPayload,
    @Body() body: SetupIntegrationRequestDto
  ): Promise<SetupIntegrationResponseDto> {
    return await this.setupIntegrationUsecase.execute(
      SetupIntegrationCommand.create({
        vercelIntegrationCode: body.vercelIntegrationCode,
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }
}
