import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  DisconnectStepResolverCommand,
  DisconnectStepResolverUsecase,
  ExternalApiAccessible,
  RequirePermissions,
} from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validateSync } from 'class-validator';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards/throttler.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import {
  DeployStepResolverManifestDto,
  DeployStepResolverRequestDto,
  DeployStepResolverResponseDto,
  DisconnectStepResolverRequestDto,
  StepResolversCountResponseDto,
} from './dtos';
import { DeployStepResolverCommand, DeployStepResolverUsecase } from './usecases/deploy-step-resolver';
import { GetStepResolversCountUsecase } from './usecases/get-step-resolvers-count';

interface UploadedBundleFile {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
}

@Controller({ path: '/step-resolvers', version: '2' })
@ApiExcludeController()
@UseInterceptors(ClassSerializerInterceptor)
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@RequireAuthentication()
export class StepResolversController {
  constructor(
    private deployStepResolverUsecase: DeployStepResolverUsecase,
    private disconnectStepResolverUsecase: DisconnectStepResolverUsecase,
    private getStepResolversCountUsecase: GetStepResolversCountUsecase
  ) {}

  @Get('/count')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.WORKFLOW_READ)
  async getCount(@UserSession() user: UserSessionData): Promise<StepResolversCountResponseDto> {
    return this.getStepResolversCountUsecase.execute(user.environmentId);
  }

  @Post('/deploy')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  @UseInterceptors(
    FileInterceptor('bundle', {
      limits: {
        files: 1,
        fileSize: 10 * 1024 * 1024,
      },
    })
  )
  async deploy(
    @UserSession() user: UserSessionData,
    @Body() body: DeployStepResolverRequestDto,
    @UploadedFile() bundle: UploadedBundleFile
  ): Promise<DeployStepResolverResponseDto> {
    if (!bundle) {
      throw new BadRequestException('Bundle file is required');
    }

    const bundleBuffer = bundle.buffer;
    if (!bundleBuffer || bundleBuffer.byteLength === 0 || bundle.size === 0) {
      throw new BadRequestException('Bundle file must not be empty');
    }
    const manifest = parseManifestOrThrow(body.manifest);

    return this.deployStepResolverUsecase.execute(
      DeployStepResolverCommand.create({
        user,
        manifestSteps: manifest.steps,
        bundleBuffer,
      })
    );
  }

  @Delete('/:stepInternalId/disconnect')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.WORKFLOW_WRITE)
  async disconnect(
    @UserSession() user: UserSessionData,
    @Param('stepInternalId') stepInternalId: string,
    @Body() body: DisconnectStepResolverRequestDto
  ): Promise<void> {
    await this.disconnectStepResolverUsecase.execute(
      DisconnectStepResolverCommand.create({
        stepInternalId,
        stepType: body.stepType,
        user,
      })
    );
  }
}

function parseManifestOrThrow(rawManifest: string): DeployStepResolverManifestDto {
  let parsedManifest: unknown;
  try {
    parsedManifest = JSON.parse(rawManifest);
  } catch {
    throw new BadRequestException('Invalid manifest JSON');
  }

  const manifestDto = plainToInstance(DeployStepResolverManifestDto, parsedManifest);
  const validationErrors = validateSync(manifestDto, {
    whitelist: true,
  });

  if (validationErrors.length > 0) {
    throw new BadRequestException({
      message: 'Invalid manifest',
      errors: formatValidationErrors(validationErrors),
    });
  }

  return manifestDto;
}

function formatValidationErrors(errors: ValidationError[]): string[] {
  const formatted: string[] = [];

  const visit = (error: ValidationError, parentPath?: string) => {
    const currentPath = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        formatted.push(`${currentPath}: ${message}`);
      }
    }

    if (error.children) {
      for (const child of error.children) {
        visit(child, currentPath);
      }
    }
  };

  for (const error of errors) {
    visit(error);
  }

  return formatted;
}
