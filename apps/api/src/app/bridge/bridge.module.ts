import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import {
  CreateChange,
  CreateMessageTemplate,
  CreateWorkflow,
  DeleteMessageTemplate,
  UpdateChange,
  UpdateMessageTemplate,
  UpdateWorkflow,
} from '@novu/application-generic';

import { BridgeController } from './bridge.controller';
import { USECASES } from './usecases';
import { SharedModule } from '../shared/shared.module';
import { PreferencesRepository } from '@novu/dal';

const PROVIDERS = [
  CreateWorkflow,
  UpdateWorkflow,
  CreateMessageTemplate,
  UpdateMessageTemplate,
  DeleteMessageTemplate,
  CreateChange,
  UpdateChange,
  PreferencesRepository,
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
