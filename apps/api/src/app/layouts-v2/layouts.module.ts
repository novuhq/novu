import { Module } from '@nestjs/common';
import { UpsertControlValuesUseCase } from '@novu/application-generic';

import { USE_CASES } from './usecases';
import { LayoutsController } from './layouts.controller';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { LayoutsV1Module } from '../layouts-v1/layouts-v1.module';

const MODULES = [SharedModule, AuthModule, LayoutsV1Module];

@Module({
  imports: MODULES,
  providers: [...USE_CASES, UpsertControlValuesUseCase],
  exports: [...USE_CASES],
  controllers: [LayoutsController],
})
export class LayoutsV2Module {}
