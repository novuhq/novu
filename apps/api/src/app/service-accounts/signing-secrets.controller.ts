import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, SigningSecretTypeEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ApiKeyV2EnvironmentGuard } from '../auth/guards/api-key-v2-environment.guard';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiNoContentResponse, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateSigningSecretResponseDto, SigningSecretResponseDto } from './dtos';
import { ApiKeysV2EnabledGuard } from './guards/api-keys-v2-enabled.guard';
import {
  CreateSigningSecret,
  CreateSigningSecretCommand,
  EnableApiKeysV2,
  EnableApiKeysV2Command,
  ListSigningSecrets,
  ListSigningSecretsCommand,
  RevokeSigningSecret,
  RevokeSigningSecretCommand,
} from './usecases';

class CreateSigningSecretRequestDto {
  @ApiProperty({ enum: SigningSecretTypeEnum })
  @IsEnum(SigningSecretTypeEnum)
  type: SigningSecretTypeEnum;
}

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/signing-secrets')
@ApiTags('Signing Secrets')
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@UseGuards(ApiKeysV2EnabledGuard, ApiKeyV2EnvironmentGuard)
export class SigningSecretsController {
  constructor(
    private readonly listSigningSecretsUsecase: ListSigningSecrets,
    private readonly createSigningSecretUsecase: CreateSigningSecret,
    private readonly revokeSigningSecretUsecase: RevokeSigningSecret,
    private readonly enableApiKeysV2Usecase: EnableApiKeysV2
  ) {}

  @Post('/enable-v2')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.API_KEY_WRITE)
  @ApiOperation({
    summary: 'Opt in to API Keys v2 for the current environment',
    description: 'Seeds signing secrets from the legacy API key so existing HMAC integrations keep validating.',
  })
  async enableApiKeysV2(@UserSession() user: UserSessionData): Promise<{ seeded: boolean }> {
    return this.enableApiKeysV2Usecase.execute(
      EnableApiKeysV2Command.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
      })
    );
  }

  @Get('/')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.API_KEY_READ)
  @ApiOperation({ summary: 'List signing secrets for the current environment' })
  @ApiResponse(SigningSecretResponseDto, 200, true)
  async listSigningSecrets(
    @UserSession() user: UserSessionData,
    @Query('type') type?: SigningSecretTypeEnum
  ): Promise<SigningSecretResponseDto[]> {
    return this.listSigningSecretsUsecase.execute(
      ListSigningSecretsCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        type,
      })
    );
  }

  @Post('/')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.API_KEY_WRITE)
  @ApiOperation({ summary: 'Create a signing secret' })
  @ApiResponse(CreateSigningSecretResponseDto, 201)
  async createSigningSecret(
    @UserSession() user: UserSessionData,
    @Body() body: CreateSigningSecretRequestDto
  ): Promise<CreateSigningSecretResponseDto> {
    return this.createSigningSecretUsecase.execute(
      CreateSigningSecretCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        type: body.type,
      })
    );
  }

  @Post('/:signingSecretId/revoke')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.API_KEY_WRITE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a signing secret' })
  @ApiParam({ name: 'signingSecretId' })
  @ApiNoContentResponse()
  async revokeSigningSecret(
    @UserSession() user: UserSessionData,
    @Param('signingSecretId') signingSecretId: string
  ): Promise<void> {
    await this.revokeSigningSecretUsecase.execute(
      RevokeSigningSecretCommand.create({
        organizationId: user.organizationId,
        userId: user._id,
        environmentId: user.environmentId,
        signingSecretId,
      })
    );
  }
}
