import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Novu } from '@novu/api';
import { UserSession } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { CreateSupportThreadDto } from './dtos/create-thread.dto';
import { PlainCardRequestDto } from './dtos/plain-card.dto';
import { PlainCardsGuard } from './guards/plain-cards.guard';
import { CreateSupportThreadUsecase, PlainCardsUsecase } from './usecases';
import { CreateSupportThreadCommand } from './usecases/create-thread.command';
import { PlainCardsCommand } from './usecases/plain-cards.command';

@Controller('/support')
@ApiExcludeController()
export class SupportController {
  constructor(
    private createSupportThreadUsecase: CreateSupportThreadUsecase,
    private plainCardsUsecase: PlainCardsUsecase
  ) {}

  @UseGuards(PlainCardsGuard)
  @Post('customer-details')
  async fetchUserOrganizations(@Body() body: PlainCardRequestDto) {
    return this.plainCardsUsecase.fetchCustomerDetails(PlainCardsCommand.create({ ...body }));
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
