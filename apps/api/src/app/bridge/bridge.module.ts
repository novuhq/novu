import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import {
  CreateChange,
  CreateMessageTemplate,
  CreateWorkflow,
  DeleteMessageTemplate,
  UpdateChange,
  UpdateMessageTemplate,
  UpdateWorkflow,
  UpsertControlValuesUseCase,
  UpsertPreferences,
} from '@novu/application-generic';
import { PreferencesRepository } from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { BridgeController } from './bridge.controller';
import { USECASES } from './usecases';

const PROVIDERS = [
  CreateWorkflow,
  UpdateWorkflow,
  CreateMessageTemplate,
  UpdateMessageTemplate,
  DeleteMessageTemplate,
  CreateChange,
  UpdateChange,
  PreferencesRepository,
  UpsertPreferences,
  UpsertControlValuesUseCase,
];

@Module({
  imports: [SharedModule],
  providers: [...PROVIDERS, ...USECASES],
  controllers: [BridgeController],
  exports: [...USECASES],
})
export class BridgeModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {}
}
