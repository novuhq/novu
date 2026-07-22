import { PreviewStep } from '@novu/application-generic';
import { BuildVirtualWorkflows } from './build-virtual-workflows';
import { DiscoverVirtualWorkflows } from './discover-virtual-workflows';
import { GetBridgeStatus } from './get-bridge-status';
import { StoreControlValuesUseCase } from './store-control-values';
import { Sync } from './sync';

export const USECASES = [
  BuildVirtualWorkflows,
  DiscoverVirtualWorkflows,
  GetBridgeStatus,
  PreviewStep,
  StoreControlValuesUseCase,
  Sync,
];
