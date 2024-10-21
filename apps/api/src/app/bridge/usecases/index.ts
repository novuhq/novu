import { UpsertControlValuesUseCase } from '@novu/application-generic';
import { DeleteWorkflow } from './delete-workflow';
import { GetBridgeStatus } from './get-bridge-status';
import { PreviewStep } from './preview-step';
import { StoreControlValuesUseCase } from './store-control-values';
import { Sync } from './sync';

export const USECASES = [
  DeleteWorkflow,
  GetBridgeStatus,
  PreviewStep,
  StoreControlValuesUseCase,
  Sync,
  UpsertControlValuesUseCase,
];
