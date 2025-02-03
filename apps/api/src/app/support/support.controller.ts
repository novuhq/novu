import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { UserAuthGuard, UserSession } from '@novu/application-generic';
import { UserSessionData } from '@novu/shared';
import { CreateSupportThreadDto } from './dto/create-thread.dto';
import { CreateSupportThreadCommand } from './usecases/create-thread.command';
import { PlainCardRequestDto } from './dto/plain-card.dto';
import { PlainCardsCommand } from './usecases/plain-cards.command';
import { CreateSupportThreadUsecase, PlainCardsUsecase } from './usecases';
import { PlainCardsGuard } from './guards/plain-cards.guard';

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

  @UseGuards(UserAuthGuard)
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
}
