import { ICreateWorkflowOverrideResponseDto } from '@novu/shared';
import { OverrideResponseDto } from './shared';

export class CreateWorkflowOverrideResponseDto
  extends OverrideResponseDto
  implements ICreateWorkflowOverrideResponseDto {}
