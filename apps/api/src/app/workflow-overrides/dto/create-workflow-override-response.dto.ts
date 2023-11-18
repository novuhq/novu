import { OverrideResponseDto } from './shared';
import { ICreateWorkflowOverrideResponseDto } from '@novu/shared';

export class CreateWorkflowOverrideResponseDto
  extends OverrideResponseDto
  implements ICreateWorkflowOverrideResponseDto {}
