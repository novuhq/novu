import { UpsertControlVariablesUseCase } from '@novu/application-generic';
import { DeleteWorkflow } from './delete-workflow';
import { GetBridgeStatus } from './get-bridge-status';
import { PreviewStep } from './preview-step';
import { StoreControlVariablesUseCase } from './store-control-variables';
import { Sync } from './sync';

export const USECASES = [
  DeleteWorkflow,
  GetBridgeStatus,
  PreviewStep,
  StoreControlVariablesUseCase,
  Sync,
  UpsertControlVariablesUseCase,
];
