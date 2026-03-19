import { GetLayoutUseCase, GetLayoutUseCaseV0, LayoutVariablesSchemaUseCase } from '@novu/application-generic';
import { BuildLayoutIssuesUsecase } from './build-layout-issues/build-layout-issues.usecase';
import { DeleteLayoutUseCase } from './delete-layout';
import { DuplicateLayoutUseCase } from './duplicate-layout';
import { GetLayoutUsageUseCase } from './get-layout-usage';
import { ListLayoutsUseCase } from './list-layouts';
import { PreviewLayoutUsecase } from './preview-layout';
import { LayoutSyncToEnvironmentUseCase } from './sync-to-environment';
import { UpsertLayout } from './upsert-layout';

export const USE_CASES = [
  UpsertLayout,
  GetLayoutUseCaseV0,
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
