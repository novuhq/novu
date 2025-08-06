import { BuildLayoutIssuesUsecase } from './build-layout-issues/build-layout-issues.usecase';
import { DeleteLayoutUseCase } from './delete-layout';
import { DuplicateLayoutUseCase } from './duplicate-layout';
import { GetLayoutUseCase } from './get-layout';
import { GetLayoutUsageUseCase } from './get-layout-usage';
import { LayoutVariablesSchemaUseCase } from './layout-variables-schema';
import { ListLayoutsUseCase } from './list-layouts';
import { PreviewLayoutUsecase } from './preview-layout';
import { LayoutSyncToEnvironmentUseCase } from './sync-to-environment';
import { UpsertLayout } from './upsert-layout';

export const USE_CASES = [
  UpsertLayout,
  GetLayoutUseCase,
  DeleteLayoutUseCase,
  DuplicateLayoutUseCase,
  ListLayoutsUseCase,
  LayoutVariablesSchemaUseCase,
  PreviewLayoutUsecase,
  GetLayoutUsageUseCase,
  BuildLayoutIssuesUsecase,
  LayoutSyncToEnvironmentUseCase,
];
