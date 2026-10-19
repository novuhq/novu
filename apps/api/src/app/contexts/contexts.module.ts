import { Module } from '@nestjs/common';
import { featureFlagsService } from '@novu/application-generic';
import { ContextRepository } from '@novu/dal';
import { SharedModule } from '../shared/shared.module';
import { ContextsController } from './contexts.controller';
import { CreateContext } from './usecases/create-context/create-context.usecase';
import { DeleteContext } from './usecases/delete-context';
import { GetContext } from './usecases/get-context';
import { ListContexts } from './usecases/list-contexts';
import { UpdateContext } from './usecases/update-context/update-context.usecase';

const USE_CASES = [CreateContext, UpdateContext, GetContext, ListContexts, DeleteContext];

const DAL_MODELS = [ContextRepository];

@Module({
  imports: [SharedModule],
  controllers: [ContextsController],
  providers: [...USE_CASES, ...DAL_MODELS, featureFlagsService],
  exports: [...USE_CASES],
})
export class ContextsModule {}
