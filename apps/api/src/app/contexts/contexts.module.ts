import { Module } from '@nestjs/common';
import { featureFlagsService } from '@novu/application-generic';
import { ContextRepository } from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { ContextsController } from './contexts.controller';
import { CreateContext } from './usecases/create-context/create-context.usecase';
import { DeleteContext } from './usecases/delete-context/delete-context.usecase';
import { GetContext } from './usecases/get-context/get-context.usecase';
import { GetContexts } from './usecases/get-contexts/get-contexts.usecase';
import { UpdateContext } from './usecases/update-context/update-context.usecase';

const USE_CASES = [CreateContext, GetContext, GetContexts, UpdateContext, DeleteContext];

const DAL_MODELS = [ContextRepository];

@Module({
  imports: [SharedModule],
  controllers: [ContextsController],
  providers: [...USE_CASES, ...DAL_MODELS, featureFlagsService],
  exports: [...USE_CASES],
})
export class ContextsModule {}
