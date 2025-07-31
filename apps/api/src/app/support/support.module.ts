import { Module } from '@nestjs/common';
import { SupportService } from '@novu/application-generic';
import { OrganizationRepository, UserRepository } from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { PlainCardsGuard } from './guards/plain-cards.guard';
import { SupportController } from './support.controller';
import { CreateSupportThreadUsecase, PlainCardsUsecase } from './usecases';

@Module({
  imports: [SharedModule],
  controllers: [SupportController],
  providers: [
    CreateSupportThreadUsecase,
    PlainCardsUsecase,
    SupportService,
    OrganizationRepository,
    UserRepository,
    PlainCardsGuard,
  ],
})
export class SupportModule {}
