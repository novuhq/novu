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
import { ExternalApiAccessible, RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, DirectionEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses, ApiNoContentResponse, ApiResponse } from '../shared/framework/response.decorator';
import { SdkGroupName, SdkMethodMaxParamsOverride, SdkMethodName } from '../shared/framework/swagger/sdk.decorators';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateDomainDto } from './dtos/create-domain.dto';
import { DiagnoseDomainResponseDto } from './dtos/diagnose-domain-response.dto';
import { CreateDomainConnectApplyUrlDto, DomainConnectApplyUrlResponseDto } from './dtos/domain-connect-apply-url.dto';
import { DomainConnectStatusResponseDto } from './dtos/domain-connect-status-response.dto';
import { DomainResponseDto } from './dtos/domain-response.dto';
import { DomainRouteDto } from './dtos/domain-route.dto';
import { DomainRouteResponseDto } from './dtos/domain-route-response.dto';
import { ListDomainRoutesQueryDto } from './dtos/list-domain-routes-query.dto';
import { ListDomainRoutesResponseDto } from './dtos/list-domain-routes-response.dto';
import { ListDomainsQueryDto } from './dtos/list-domains-query.dto';
import { ListDomainsResponseDto } from './dtos/list-domains-response.dto';
import { TestDomainRouteDto } from './dtos/test-domain-route.dto';
import { TestDomainRouteResponseDto } from './dtos/test-domain-route-response.dto';
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
import { DiagnoseDomainCommand } from './usecases/diagnose-domain/diagnose-domain.command';
import { DiagnoseDomain } from './usecases/diagnose-domain/diagnose-domain.usecase';
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
import { TestDomainRouteCommand } from './usecases/test-domain-route/test-domain-route.command';
import { TestDomainRoute } from './usecases/test-domain-route/test-domain-route.usecase';
import { UpdateDomainCommand } from './usecases/update-domain/update-domain.command';
import { UpdateDomain } from './usecases/update-domain/update-domain.usecase';
import { UpdateDomainRouteCommand } from './usecases/update-domain-route/update-domain-route.command';
import { UpdateDomainRoute } from './usecases/update-domain-route/update-domain-route.usecase';
import { VerifyDomainCommand } from './usecases/verify-domain/verify-domain.command';
import { VerifyDomain } from './usecases/verify-domain/verify-domain.usecase';

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
    private readonly verifyDomainUsecase: VerifyDomain,
    private readonly diagnoseDomainUsecase: DiagnoseDomain,
    private readonly getDomainConnectStatusUsecase: GetDomainConnectStatus,
    private readonly createDomainConnectApplyUrlUsecase: CreateDomainConnectApplyUrl,
    private readonly listDomainRoutesUsecase: ListDomainRoutes,
    private readonly createDomainRouteUsecase: CreateDomainRoute,
    private readonly getDomainRouteUsecase: GetDomainRoute,
    private readonly updateDomainRouteUsecase: UpdateDomainRoute,
    private readonly deleteDomainRouteUsecase: DeleteDomainRoute,
    private readonly testDomainRouteUsecase: TestDomainRoute
  ) {}

  @Get('/')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  @ApiOperation({
    summary: 'List domains for an environment',
    description:
      'Returns a paginated list of inbound-email domains in the current environment. Supports cursor pagination and a name contains filter.',
  })
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
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({
    summary: 'Create a domain',
    description:
      'Registers a new inbound-email domain. The response includes the DNS records customers must add at their DNS provider before the domain can receive mail.',
  })
  @ApiResponse(DomainResponseDto, 201)
  @SdkMethodName('create')
  async createDomain(@Body() body: CreateDomainDto, @UserSession() user: UserSessionData): Promise<DomainResponseDto> {
    return this.createDomainUsecase.execute(
      CreateDomainCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        name: body.name,
        data: body.data,
      })
    );
  }

  @Get('/:domain')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  @ApiOperation({
    summary: 'Retrieve a domain by name',
    description:
      'Returns the domain configuration and the DNS records that must be in place. This is a pure read; call `domains.verify` to refresh verification status from DNS.',
  })
  @ApiResponse(DomainResponseDto, 200)
  @SdkMethodName('retrieve')
  async getDomain(@Param('domain') domain: string, @UserSession() user: UserSessionData): Promise<DomainResponseDto> {
    return this.getDomainUsecase.execute(
      GetDomainCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domain,
      })
    );
  }

  @Post('/:domain/verify')
  @HttpCode(HttpStatus.OK)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({
    summary: 'Verify a domain',
    description:
      'Performs a live DNS lookup to refresh the MX record status of the domain and updates the verification status accordingly. Returns the latest domain configuration.',
  })
  @ApiResponse(DomainResponseDto, 200)
  @SdkMethodName('verify')
  async verifyDomain(
    @Param('domain') domain: string,
    @UserSession() user: UserSessionData
  ): Promise<DomainResponseDto> {
    return this.verifyDomainUsecase.execute(
      VerifyDomainCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domain,
      })
    );
  }

  @Post('/:domain/diagnose')
  @HttpCode(HttpStatus.OK)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  @ApiOperation({
    summary: 'Diagnose inbound DNS for a domain',
    description:
      'Runs live DNS checks for inbound email readiness (MX correctness, apex CNAME collision, and common DNS blocklists for the Novu mail host). Returns structured issues with plain-language fixes.',
  })
  @ApiResponse(DiagnoseDomainResponseDto, 200)
  @SdkMethodName('diagnose')
  async diagnoseDomain(
    @Param('domain') domain: string,
    @UserSession() user: UserSessionData
  ): Promise<DiagnoseDomainResponseDto> {
    return this.diagnoseDomainUsecase.execute(
      DiagnoseDomainCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domain,
      })
    );
  }

  @Get('/:domain/routes')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  @ApiOperation({
    summary: 'List routes for a domain',
    description:
      'Returns a paginated list of routes attached to the domain. Optionally filter by an agent identifier to find routes pointing to a specific agent.',
  })
  @ApiResponse(ListDomainRoutesResponseDto, 200)
  @SdkGroupName('Domains.Routes')
  @SdkMethodName('list')
  async listDomainRoutes(
    @Param('domain') domain: string,
    @Query() query: ListDomainRoutesQueryDto,
    @UserSession() user: UserSessionData
  ): Promise<ListDomainRoutesResponseDto> {
    return this.listDomainRoutesUsecase.execute(
      ListDomainRoutesCommand.create({
        user,
        domain,
        agentId: query.agentId,
        limit: Number(query.limit || '10'),
        after: query.after,
        before: query.before,
        orderDirection: query.orderDirection || DirectionEnum.DESC,
        orderBy: query.orderBy || '_id',
        includeCursor: query.includeCursor,
      })
    );
  }

  @Post('/:domain/routes')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({
    summary: 'Create a route',
    description:
      'Creates a route on the domain that forwards inbound mail addressed to `<address>@<domain>` to either a webhook or an agent. Each address on a domain may only have a single route.',
  })
  @ApiResponse(DomainRouteResponseDto, 201)
  @SdkGroupName('Domains.Routes')
  @SdkMethodName('create')
  async createDomainRoute(
    @Param('domain') domain: string,
    @Body() body: DomainRouteDto,
    @UserSession() user: UserSessionData
  ): Promise<DomainRouteResponseDto> {
    return this.createDomainRouteUsecase.execute(
      CreateDomainRouteCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domain,
        address: body.address,
        agentId: body.agentId,
        type: body.type,
        data: body.data,
      })
    );
  }

  @Get('/:domain/routes/:address')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  @ApiOperation({
    summary: 'Retrieve a route by address',
    description:
      'Returns the route bound to `<address>@<domain>`. Use `*` as the address to retrieve the wildcard route for the domain.',
  })
  @ApiResponse(DomainRouteResponseDto, 200)
  @SdkGroupName('Domains.Routes')
  @SdkMethodName('retrieve')
  async getDomainRoute(
    @Param('domain') domain: string,
    @Param('address') address: string,
    @UserSession() user: UserSessionData
  ): Promise<DomainRouteResponseDto> {
    return this.getDomainRouteUsecase.execute(
      GetDomainRouteCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domain,
        address: decodeURIComponent(address),
      })
    );
  }

  @Patch('/:domain/routes/:address')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({
    summary: 'Update a route',
    description:
      'Updates the destination of the route bound to `<address>@<domain>`. The address itself is the resource identity and cannot be changed; delete and recreate the route to rename it.',
  })
  @ApiResponse(DomainRouteResponseDto, 200)
  @SdkGroupName('Domains.Routes')
  @SdkMethodName('update')
  @SdkMethodMaxParamsOverride(4)
  async updateDomainRoute(
    @Param('domain') domain: string,
    @Param('address') address: string,
    @Body() body: UpdateDomainRouteDto,
    @UserSession() user: UserSessionData
  ): Promise<DomainRouteResponseDto> {
    return this.updateDomainRouteUsecase.execute(
      UpdateDomainRouteCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domain,
        address: decodeURIComponent(address),
        agentId: body.agentId,
        type: body.type,
        data: body.data,
      })
    );
  }

  @Delete('/:domain/routes/:address')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({
    summary: 'Delete a route',
    description:
      'Removes the route bound to `<address>@<domain>`. Inbound mail for that address will no longer be processed.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @SdkGroupName('Domains.Routes')
  @SdkMethodName('delete')
  async deleteDomainRoute(
    @Param('domain') domain: string,
    @Param('address') address: string,
    @UserSession() user: UserSessionData
  ): Promise<void> {
    return this.deleteDomainRouteUsecase.execute(
      DeleteDomainRouteCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domain,
        address: decodeURIComponent(address),
      })
    );
  }

  @Post('/:domain/routes/:address/test')
  @HttpCode(HttpStatus.OK)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({
    summary: 'Test an inbound route',
    description:
      'Sends a synthetic inbound email through the same delivery path as production (outbound webhooks for webhook routes, signed HTTP to the agent for agent routes). Use `dryRun: true` to preview the payload without delivering.',
  })
  @ApiResponse(TestDomainRouteResponseDto, 200)
  @SdkGroupName('Domains.Routes')
  @SdkMethodName('test')
  @SdkMethodMaxParamsOverride(4)
  async testDomainRoute(
    @Param('domain') domain: string,
    @Param('address') address: string,
    @Body() body: TestDomainRouteDto,
    @UserSession() user: UserSessionData
  ): Promise<TestDomainRouteResponseDto> {
    return this.testDomainRouteUsecase.execute(
      TestDomainRouteCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domain,
        address: decodeURIComponent(address),
        from: body.from,
        subject: body.subject,
        text: body.text,
        html: body.html,
        dryRun: body.dryRun,
      })
    );
  }

  @Get('/:domain/auto-configure')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_READ)
  @ApiOperation({
    summary: 'Retrieve auto-configuration availability',
    description:
      'Returns whether DNS auto-configuration (Domain Connect) is available for this domain. When `available` is `false`, `manualRecords` lists the DNS records the customer must add manually.',
  })
  @ApiResponse(DomainConnectStatusResponseDto, 200)
  @SdkGroupName('Domains.AutoConfigure')
  @SdkMethodName('retrieve')
  async getDomainAutoConfigure(
    @Param('domain') domain: string,
    @UserSession() user: UserSessionData
  ): Promise<DomainConnectStatusResponseDto> {
    return this.getDomainConnectStatusUsecase.execute(
      GetDomainConnectStatusCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domain,
      })
    );
  }

  @Post('/:domain/auto-configure/start')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({
    summary: 'Start DNS auto-configuration',
    description:
      'Generates a signed redirect URL the customer can follow to apply Novu DNS records at their DNS provider. After the provider completes the flow, it redirects back to `redirectUri`.',
  })
  @ApiResponse(DomainConnectApplyUrlResponseDto, 201)
  @SdkGroupName('Domains.AutoConfigure')
  @SdkMethodName('start')
  async startDomainAutoConfigure(
    @Param('domain') domain: string,
    @Body() body: CreateDomainConnectApplyUrlDto,
    @UserSession() user: UserSessionData
  ): Promise<DomainConnectApplyUrlResponseDto> {
    return this.createDomainConnectApplyUrlUsecase.execute(
      CreateDomainConnectApplyUrlCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domain,
        redirectUri: body?.redirectUri,
      })
    );
  }

  @Patch('/:domain')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({
    summary: 'Update a domain',
    description:
      'Updates optional domain fields. When `data` is provided, it replaces the entire metadata object; omit `data` to leave it unchanged.',
  })
  @ApiResponse(DomainResponseDto, 200)
  @SdkMethodName('update')
  async updateDomain(
    @Param('domain') domain: string,
    @Body() body: UpdateDomainDto,
    @UserSession() user: UserSessionData
  ): Promise<DomainResponseDto> {
    return this.updateDomainUsecase.execute(
      UpdateDomainCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domain,
        data: body.data,
      })
    );
  }

  @Delete('/:domain')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.ORG_SETTINGS_WRITE)
  @ApiOperation({
    summary: 'Delete a domain',
    description:
      'Removes the domain and cascades the deletion to all of its routes. Inbound mail for that domain stops being processed immediately.',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @SdkMethodName('delete')
  async deleteDomain(@Param('domain') domain: string, @UserSession() user: UserSessionData): Promise<void> {
    return this.deleteDomainUsecase.execute(
      DeleteDomainCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        domain,
      })
    );
  }
}
