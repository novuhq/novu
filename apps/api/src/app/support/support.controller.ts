import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Novu } from '@novu/api';
import { PinoLogger, SkipPermissionsCheck, UserSession } from '@novu/application-generic';
import { OrganizationRepository } from '@novu/dal';
import { UserSessionData } from '@novu/shared';
import type { Response } from 'express';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { AgentsEarlyAccessDto } from './dtos/agents-early-access.dto';
import { CreateSupportThreadDto } from './dtos/create-thread.dto';
import { DocsAssistantMessageRequestDto } from './dtos/docs-assistant-message-request.dto';
import { DocsAssistantSearchRequestDto } from './dtos/docs-assistant-search-request.dto';
import { PlainCardRequestDto } from './dtos/plain-card.dto';
import { PlainCardsGuard } from './guards/plain-cards.guard';
import { CreateSupportThreadUsecase, PlainCardsUsecase } from './usecases';
import { CreateSupportThreadCommand } from './usecases/create-thread.command';
import { PlainCardsCommand } from './usecases/plain-cards.command';
import { SearchDocsCommand, SearchDocsUsecase } from './usecases/search-docs';
import { SendDocsMessageCommand, SendDocsMessageUsecase } from './usecases/send-docs-message';

@Controller('/support')
@ApiExcludeController()
export class SupportController {
  constructor(
    private createSupportThreadUsecase: CreateSupportThreadUsecase,
    private organizationRepository: OrganizationRepository,
    private logger: PinoLogger,
    private plainCardsUsecase: PlainCardsUsecase,
    private searchDocsUsecase: SearchDocsUsecase,
    private sendDocsMessageUsecase: SendDocsMessageUsecase
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
    const organization = await this.organizationRepository.findById(user.organizationId);
    const organizationName = organization?.name ?? '';

    const secretKey = process.env.NOVU_INTERNAL_SECRET_KEY;

    if (!secretKey) {
      this.logger.warn(
        'NOVU_INTERNAL_SECRET_KEY is not set; skipping early-access-request-agents-internal-email trigger'
      );

      return {
        success: true,
      };
    }

    const novu = new Novu({
      security: {
        secretKey,
      },
    });

    await novu.trigger({
      workflowId: 'early-access-request-agents-internal-email',
      to: {
        subscriberId: 'dima-internal',
        email: 'dima@novu.co',
      },
      payload: {
        howAgentRunsToday: body.howAgentRunsToday.label,
        whatAgentDoes: body.whatAgentDoes,
        plannedProviders: body.plannedProviders.map((p) => p.label),
        organizationId: user.organizationId,
        organizationName,
        userEmail: user.email ?? '',
      },
    });

    return {
      success: true,
    };
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

  @RequireAuthentication()
  @SkipPermissionsCheck()
  @Post('docs-assistant/search')
  async searchDocs(@Body() body: DocsAssistantSearchRequestDto, @UserSession() user: UserSessionData) {
    return this.searchDocsUsecase.execute(
      SearchDocsCommand.create({
        query: body.query,
        pageSize: body.pageSize,
        userId: user._id as string,
      })
    );
  }

  @RequireAuthentication()
  @SkipPermissionsCheck()
  @Post('docs-assistant/message')
  async docsAssistantMessage(
    @Body() body: DocsAssistantMessageRequestDto,
    @UserSession() user: UserSessionData,
    @Res() res: Response
  ): Promise<void> {
    const result = await this.sendDocsMessageUsecase.execute(
      SendDocsMessageCommand.create({
        fp: user._id as string,
        threadId: body.threadId,
        threadKey: body.threadKey,
        messages: body.messages,
        retrievalPageSize: body.retrievalPageSize,
        currentPath: body.currentPath,
        userId: user._id as string,
      }),
      res
    );

    if (result.handled) {
      return;
    }

    res.json(result.body);
  }
}
