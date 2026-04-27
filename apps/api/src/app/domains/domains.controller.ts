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
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, DirectionEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiNoContentResponse, ApiResponse } from '../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateDomainDto } from './dtos/create-domain.dto';
import { CreateDomainConnectApplyUrlDto, DomainConnectApplyUrlResponseDto } from './dtos/domain-connect-apply-url.dto';
import { DomainConnectStatusResponseDto } from './dtos/domain-connect-status-response.dto';
import { DomainResponseDto } from './dtos/domain-response.dto';
import { DomainRouteDto } from './dtos/domain-route.dto';
import { DomainRouteResponseDto } from './dtos/domain-route-response.dto';
import { ListDomainRoutesQueryDto } from './dtos/list-domain-routes-query.dto';
import { ListDomainRoutesResponseDto } from './dtos/list-domain-routes-response.dto';
import { ListDomainsQueryDto } from './dtos/list-domains-query.dto';
import { ListDomainsResponseDto } from './dtos/list-domains-response.dto';
import { UpdateDomainDto } from './dtos/update-domain.dto';
import { UpdateDomainRouteDto } from './dtos/update-domain-route.dto';
import { CreateDomainCommand } from './usecases/create-domain/create-domain.command';
import { CreateDomain } from './usecases/create-domain/create-domain.usecase';
import { CreateDomainConnectApplyUrlCommand } from './usecases/create-domain-connect-apply-url/create-domain-connect-apply-url.command';
import { CreateDomainConnectApplyUrl } from './usecases/create-domain-connect-apply-url/create-domain-connect-apply-url.usecase';
import { CreateDomainRouteCommand } from './usecases/create-domain-route/create-domain-route.command';
import { CreateDomainRoute } from './usecases/create-domain-route/create-domain-route.usecase';
import { DeleteDomainCommand } from './usecases/delete-domain/delete-domain.command';
import { DeleteDomain } from './usecases/delete-domain/delete-domain.usecase';
import { DeleteDomainRouteCommand } from './usecases/delete-domain-route/delete-domain-route.command';
import { DeleteDomainRoute } from './usecases/delete-domain-route/delete-domain-route.usecase';
import { GetDomainCommand } from './usecases/get-domain/get-domain.command';
import { GetDomain } from './usecases/get-domain/get-domain.usecase';
import { GetDomainConnectStatusCommand } from './usecases/get-domain-connect-status/get-domain-connect-status.command';
import { GetDomainConnectStatus } from './usecases/get-domain-connect-status/get-domain-connect-status.usecase';
import { GetDomainRouteCommand } from './usecases/get-domain-route/get-domain-route.command';
import { GetDomainRoute } from './usecases/get-domain-route/get-domain-route.usecase';
import { GetDomainsCommand } from './usecases/get-domains/get-domains.command';
import { GetDomains } from './usecases/get-domains/get-domains.usecase';
import { ListDomainRoutesCommand } from './usecases/list-domain-routes/list-domain-routes.command';
import { ListDomainRoutes } from './usecases/list-domain-routes/list-domain-routes.usecase';
import { UpdateDomainCommand } from './usecases/update-domain/update-domain.command';
import { UpdateDomain } from './usecases/update-domain/update-domain.usecase';
import { UpdateDomainRouteCommand } from './usecases/update-domain-route/update-domain-route.command';
import { UpdateDomainRoute } from './usecases/update-domain-route/update-domain-route.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/domains')
@UseInterceptors(ClassSerializerInterceptor)
@RequireAuthentication()
@ApiTags('Domains')
@SdkGroupName('Domains')
export class DomainsController {
  constructor(
    private readonly createDomainUsecase: CreateDomain,
    private readonly getDomainsUsecase: GetDomains,
    private readonly getDomainUsecase: GetDomain,
    private readonly deleteDomainUsecase: DeleteDomain,
    private readonly updateDomainUsecase: UpdateDomain,
    private readonly getDomainConnectStatusUsecase: GetDomainConnectStatus,
    private readonly createDomainConnectApplyUrlUsecase: CreateDomainConnectApplyUrl,
    private readonly listDomainRoutesUsecase: ListDomainRoutes,
    private readonly createDomainRouteUsecase: CreateDomainRoute,
    private readonly getDomainRouteUsecase: GetDomainRoute,
    private readonly updateDomainRouteUsecase: UpdateDomainRoute,
    private readonly deleteDomainRouteUsecase: DeleteDomainRoute
  ) {}

  @Get('/')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  @ApiOperation({ summary: 'List domains for an environment' })
  @ApiResponse(ListDomainsResponseDto, 200)
  @SdkMethodName('list')
  async listDomains(
    @UserSession() user: UserSessionData,
    @Query() query: ListDomainsQueryDto
  ): Promise<ListDomainsResponseDto> {
    return this.getDomainsUsecase.execute(
      GetDomainsCommand.create({
        user,
        limit: Number(query.limit || '10'),
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        orderBy: query.orderBy || '_id',
        includeCursor: query.includeCursor,
        name: query.name,
      })
    );
  }

  @Post('/')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({ summary: 'Create a new domain' })
  @ApiResponse(DomainResponseDto, 201)
  @SdkMethodName('create')
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

  @Get('/routes')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  @ApiOperation({ summary: 'List domain routes for an environment' })
  @ApiResponse(ListDomainRoutesResponseDto, 200)
  @SdkGroupName('Domains.Routes')
  @SdkMethodName('listForEnvironment')
  async listRoutes(
    @UserSession() user: UserSessionData,
    @Query() query: ListDomainRoutesQueryDto
  ): Promise<ListDomainRoutesResponseDto> {
    return this.listDomainRoutesUsecase.execute(
      ListDomainRoutesCommand.create({
        user,
        destination: query.destination,
        limit: Number(query.limit || '10'),
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        orderBy: query.orderBy || '_id',
        includeCursor: query.includeCursor,
      })
    );
  }

  @Get('/:domainId')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  @ApiOperation({ summary: 'Get a domain by ID' })
  @ApiResponse(DomainResponseDto, 200)
  @SdkMethodName('retrieve')
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

  @Get('/:domainId/routes')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  @ApiOperation({ summary: 'List routes for a domain' })
  @ApiResponse(ListDomainRoutesResponseDto, 200)
  @SdkGroupName('Domains.Routes')
  @SdkMethodName('list')
  async listDomainRoutes(
    @Param('domainId') domainId: string,
    @Query() query: ListDomainRoutesQueryDto,
    @UserSession() user: UserSessionData
  ): Promise<ListDomainRoutesResponseDto> {
    return this.listDomainRoutesUsecase.execute(
      ListDomainRoutesCommand.create({
        user,
        domainId,
        limit: Number(query.limit || '10'),
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        orderBy: query.orderBy || '_id',
        includeCursor: query.includeCursor,
      })
    );
  }

  @Post('/:domainId/routes')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({ summary: 'Create a domain route' })
  @ApiResponse(DomainRouteResponseDto, 201)
  @SdkGroupName('Domains.Routes')
  @SdkMethodName('create')
  async createDomainRoute(
    @Param('domainId') domainId: string,
    @Body() body: DomainRouteDto,
    @UserSession() user: UserSessionData
  ): Promise<DomainRouteResponseDto> {
    return this.createDomainRouteUsecase.execute(
      CreateDomainRouteCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domainId,
        address: body.address,
        destination: body.destination,
        type: body.type,
      })
    );
  }

  @Get('/:domainId/routes/:routeId')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  @ApiOperation({ summary: 'Get a domain route by ID' })
  @ApiResponse(DomainRouteResponseDto, 200)
  @SdkGroupName('Domains.Routes')
  @SdkMethodName('retrieve')
  async getDomainRoute(
    @Param('domainId') domainId: string,
    @Param('routeId') routeId: string,
    @UserSession() user: UserSessionData
  ): Promise<DomainRouteResponseDto> {
    return this.getDomainRouteUsecase.execute(
      GetDomainRouteCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domainId,
        routeId,
      })
    );
  }

  @Patch('/:domainId/routes/:routeId')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({ summary: 'Update a domain route' })
  @ApiResponse(DomainRouteResponseDto, 200)
  @SdkGroupName('Domains.Routes')
  @SdkMethodName('update')
  async updateDomainRoute(
    @Param('domainId') domainId: string,
    @Param('routeId') routeId: string,
    @Body() body: UpdateDomainRouteDto,
    @UserSession() user: UserSessionData
  ): Promise<DomainRouteResponseDto> {
    return this.updateDomainRouteUsecase.execute(
      UpdateDomainRouteCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domainId,
        routeId,
        address: body.address,
        destination: body.destination,
        type: body.type,
      })
    );
  }

  @Delete('/:domainId/routes/:routeId')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({ summary: 'Delete a domain route' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @SdkGroupName('Domains.Routes')
  @SdkMethodName('delete')
  async deleteDomainRoute(
    @Param('domainId') domainId: string,
    @Param('routeId') routeId: string,
    @UserSession() user: UserSessionData
  ): Promise<void> {
    return this.deleteDomainRouteUsecase.execute(
      DeleteDomainRouteCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domainId,
        routeId,
      })
    );
  }

  @Get('/:domainId/domain-connect/status')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  @ApiOperation({ summary: 'Get Domain Connect auto-configuration availability for a domain' })
  @ApiResponse(DomainConnectStatusResponseDto, 200)
  @SdkGroupName('Domains.DomainConnect')
  @SdkMethodName('status')
  async getDomainConnectStatus(
    @Param('domainId') domainId: string,
    @UserSession() user: UserSessionData
  ): Promise<DomainConnectStatusResponseDto> {
    return this.getDomainConnectStatusUsecase.execute(
      GetDomainConnectStatusCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domainId,
      })
    );
  }

  @Post('/:domainId/domain-connect/apply-url')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({ summary: 'Create a signed Domain Connect apply URL for a domain' })
  @ApiResponse(DomainConnectApplyUrlResponseDto, 201)
  @SdkGroupName('Domains.DomainConnect')
  @SdkMethodName('create')
  async createDomainConnectApplyUrl(
    @Param('domainId') domainId: string,
    @Body() body: CreateDomainConnectApplyUrlDto,
    @UserSession() user: UserSessionData
  ): Promise<DomainConnectApplyUrlResponseDto> {
    return this.createDomainConnectApplyUrlUsecase.execute(
      CreateDomainConnectApplyUrlCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domainId,
        redirectUri: body?.redirectUri,
      })
    );
  }

  @Patch('/:domainId')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({ summary: 'Update a domain' })
  @ApiResponse(DomainResponseDto, 200)
  @SdkMethodName('update')
  async updateDomain(
    @Param('domainId') domainId: string,
    @Body() _body: UpdateDomainDto,
    @UserSession() user: UserSessionData
  ): Promise<DomainResponseDto> {
    return this.updateDomainUsecase.execute(
      UpdateDomainCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domainId,
      })
    );
  }

  @Delete('/:domainId')
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({ summary: 'Delete a domain' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @SdkMethodName('delete')
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
