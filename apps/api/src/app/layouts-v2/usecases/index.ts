import { UpsertLayoutUseCase } from './upsert-layout';
import { GetLayoutUseCase } from './get-layout';
import { DeleteLayoutUseCase } from './delete-layout';
import { DuplicateLayoutUseCase } from './duplicate-layout';
import { ListLayoutsUseCase } from './list-layouts';
import { LayoutVariablesSchemaUseCase } from './layout-variables-schema';
import { PreviewLayoutUsecase } from './preview-layout';
import { BuildLayoutIssuesUsecase } from './build-layout-issues/build-layout-issues.usecase';

export const USE_CASES = [
  UpsertLayoutUseCase,
  GetLayoutUseCase,
  DeleteLayoutUseCase,
  DuplicateLayoutUseCase,
  ListLayoutsUseCase,
  LayoutVariablesSchemaUseCase,
  PreviewLayoutUsecase,
  BuildLayoutIssuesUsecase,
];
