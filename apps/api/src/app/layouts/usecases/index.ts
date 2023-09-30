import { GetLayoutUseCase, GetNovuLayout } from '@novu/application-generic';

import { CreateDefaultLayoutChangeUseCase } from './create-default-layout-change/create-default-layout-change.usecase';
import { CheckLayoutIsUsedUseCase } from './check-layout-is-used/check-layout-is-used.use-case';
import { CreateLayoutUseCase } from './create-layout/create-layout.use-case';
import { CreateLayoutChangeUseCase } from './create-layout-change/create-layout-change.use-case';
import { DeleteLayoutUseCase } from './delete-layout/delete-layout.use-case';
import { FilterLayoutsUseCase } from './filter-layouts/filter-layouts.use-case';
import { FindDeletedLayoutUseCase } from './find-deleted-layout/find-deleted-layout.use-case';
import { SetDefaultLayoutUseCase } from './set-default-layout/set-default-layout.use-case';
import { UpdateLayoutUseCase } from './update-layout/update-layout.use-case';
import { CreateDefaultLayout } from './create-default-layout/create-default-layout.usecase';

export * from './check-layout-is-used';
export * from './create-default-layout';
export * from './create-layout';
export * from './create-layout-change';
export * from './delete-layout';
export * from './filter-layouts';
export * from './find-deleted-layout';
export * from './set-default-layout';
export * from './update-layout';

export const USE_CASES = [
  CreateDefaultLayoutChangeUseCase,
  CheckLayoutIsUsedUseCase,
  CreateDefaultLayout,
  CreateLayoutChangeUseCase,
  CreateLayoutUseCase,
  DeleteLayoutUseCase,
  FilterLayoutsUseCase,
  FindDeletedLayoutUseCase,
  GetLayoutUseCase,
  GetNovuLayout,
  SetDefaultLayoutUseCase,
  UpdateLayoutUseCase,
];
