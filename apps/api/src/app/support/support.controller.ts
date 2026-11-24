import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Novu } from '@novu/api';
import { PinoLogger, UserSession } from '@novu/application-generic';
import { OrganizationRepository } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { AgentsEarlyAccessDto } from './dtos/agents-early-access.dto';
import { CreateSupportThreadDto } from './dtos/create-thread.dto';
import { DataSourcesEarlyAccessDto } from './dtos/data-sources-early-access.dto';
import { PlainCardRequestDto } from './dtos/plain-card.dto';
import { ProviderRequestDto } from './dtos/provider-request.dto';
import { PlainCardsGuard } from './guards/plain-cards.guard';
import { CreateSupportThreadUsecase, PlainCardsUsecase } from './usecases';
import { CreateSupportThreadCommand } from './usecases/create-thread.command';
import { PlainCardsCommand } from './usecases/plain-cards.command';

@Controller('/support')
@ApiExcludeController()
export class SupportController {
  constructor(
    private createSupportThreadUsecase: CreateSupportThreadUsecase,
    private organizationRepository: OrganizationRepository,
    private logger: PinoLogger,
    private plainCardsUsecase: PlainCardsUsecase
  ) {
    this.logger.setContext(SupportController.name);
  }

  @UseGuards(PlainCardsGuard)
  @Post('customer-details')
  async fetchUserOrganizations(@Body() body: PlainCardRequestDto) {
    return this.plainCardsUsecase.fetchCustomerDetails(PlainCardsCommand.create({ ...body }));
  }

  @RequireAuthentication()
  @Post('agents-early-access')
  async submitAgentsEarlyAccess(@Body() body: AgentsEarlyAccessDto, @UserSession() user: UserSessionData) {
    await this.triggerEarlyAccessEmail('early-access-request-agents-internal-email', user, {
      howAgentRunsToday: body.howAgentRunsToday.label,
      whatAgentDoes: body.whatAgentDoes,
      plannedProviders: body.plannedProviders.map((p) => p.label),
    });

    return {
      success: true,
    };
  }

  @RequireAuthentication()
  @Post('data-sources-early-access')
  async submitDataSourcesEarlyAccess(@Body() body: DataSourcesEarlyAccessDto, @UserSession() user: UserSessionData) {
    await this.triggerEarlyAccessEmail('early-access-request-data-sources-internal-email', user, {
      plannedSources: body.plannedSources.map((source) => source.label),
      useCase: body.useCase,
    });

    return {
      success: true,
    };
  }

  @RequireAuthentication()
  @Post('provider-request')
  async submitProviderRequest(@Body() body: ProviderRequestDto, @UserSession() user: UserSessionData) {
    await this.triggerEarlyAccessEmail('provider-request-internal-email', user, {
      providerName: body.providerName,
      useCase: body.useCase ?? '',
    });

    return {
      success: true,
    };
  }

  /** Emails the team about a request from the dashboard, with the requester's organization and email added. */
  private async triggerEarlyAccessEmail(
    workflowId: string,
    user: UserSessionData,
    payload: Record<string, string | string[]>
  ) {
    const secretKey = process.env.NOVU_INTERNAL_SECRET_KEY;

    if (!secretKey) {
      this.logger.warn(`NOVU_INTERNAL_SECRET_KEY is not set; skipping ${workflowId} trigger`);

      return;
    }

    const organization = await this.organizationRepository.findById(user.organizationId);
    const novu = new Novu({
      security: {
        secretKey,
      },
    });

    await novu.trigger({
      workflowId,
      to: {
        subscriberId: 'dima-internal',
        email: 'dima@novu.co',
      },
      payload: {
        ...payload,
        organizationId: user.organizationId,
        organizationName: organization?.name ?? '',
        userEmail: user.email ?? '',
      },
    });
  }

  @RequireAuthentication()
  @Post('create-thread')
  async createThread(@Body() body: CreateSupportThreadDto, @UserSession() user: UserSessionData) {
    return this.createSupportThreadUsecase.execute(
      CreateSupportThreadCommand.create({
        text: body.text,
        email: user.email as string,
        firstName: user.firstName as string,
        lastName: user.lastName as string,
        userId: user._id as string,
      })
    );
  }

  @RequireAuthentication()
  @Post('mobile-setup')
  async mobileSetup(@UserSession() user: UserSessionData) {
    const novu = new Novu({
      security: {
        secretKey: process.env.NOVU_INTERNAL_SECRET_KEY,
      },
    });

    await novu.trigger({
      workflowId: 'mobile-setup-email',
      to: {
        subscriberId: user._id as string,
        firstName: user.firstName as string,
        lastName: user.lastName as string,
        email: user.email as string,
      },
      payload: {},
    });
  }
}
