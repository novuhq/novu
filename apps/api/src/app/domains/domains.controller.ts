import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiRateLimitCategoryEnum, UserSessionData } from '@novu/shared';

import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiNoContentResponse, ApiResponse } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateDomainDto } from './dtos/create-domain.dto';
import { DomainResponseDto } from './dtos/domain-response.dto';
import { UpdateDomainDto } from './dtos/update-domain.dto';
import { CreateDomainCommand } from './usecases/create-domain/create-domain.command';
import { CreateDomain } from './usecases/create-domain/create-domain.usecase';
import { DeleteDomainCommand } from './usecases/delete-domain/delete-domain.command';
import { DeleteDomain } from './usecases/delete-domain/delete-domain.usecase';
import { GetDomainCommand } from './usecases/get-domain/get-domain.command';
import { GetDomain } from './usecases/get-domain/get-domain.usecase';
import { GetDomainsCommand } from './usecases/get-domains/get-domains.command';
import { GetDomains } from './usecases/get-domains/get-domains.usecase';
import { UpdateDomainCommand } from './usecases/update-domain/update-domain.command';
import { UpdateDomain } from './usecases/update-domain/update-domain.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/domains')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
@ApiTags('Domains')
export class DomainsController {
  constructor(
    private readonly createDomainUsecase: CreateDomain,
    private readonly getDomainsUsecase: GetDomains,
    private readonly getDomainUsecase: GetDomain,
    private readonly deleteDomainUsecase: DeleteDomain,
    private readonly updateDomainUsecase: UpdateDomain
  ) {}

  @Get('/')
  @ApiOperation({ summary: 'List domains for an environment' })
  @ApiResponse(DomainResponseDto, 200, true)
  async listDomains(@UserSession() user: UserSessionData): Promise<DomainResponseDto[]> {
    return this.getDomainsUsecase.execute(
      GetDomainsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Post('/')
  @ApiOperation({ summary: 'Create a new domain' })
  @ApiResponse(DomainResponseDto, 201)
  async createDomain(@Body() body: CreateDomainDto, @UserSession() user: UserSessionData): Promise<DomainResponseDto> {
    return this.createDomainUsecase.execute(
      CreateDomainCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        name: body.name,
      })
    );
  }

  @Get('/:domainId')
  @ApiOperation({ summary: 'Get a domain by ID' })
  @ApiResponse(DomainResponseDto, 200)
  async getDomain(
    @Param('domainId') domainId: string,
    @UserSession() user: UserSessionData
  ): Promise<DomainResponseDto> {
    return this.getDomainUsecase.execute(
      GetDomainCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domainId,
      })
    );
  }

  @Patch('/:domainId')
  @ApiOperation({ summary: 'Update a domain' })
  @ApiResponse(DomainResponseDto, 200)
  async updateDomain(
    @Param('domainId') domainId: string,
    @Body() body: UpdateDomainDto,
    @UserSession() user: UserSessionData
  ): Promise<DomainResponseDto> {
    return this.updateDomainUsecase.execute(
      UpdateDomainCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domainId,
        routes: body.routes,
      })
    );
  }

  @Delete('/:domainId')
  @ApiOperation({ summary: 'Delete a domain' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async deleteDomain(@Param('domainId') domainId: string, @UserSession() user: UserSessionData): Promise<void> {
    return this.deleteDomainUsecase.execute(
      DeleteDomainCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domainId,
      })
    );
  }
}
