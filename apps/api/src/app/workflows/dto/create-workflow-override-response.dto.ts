import {
  EnvironmentId,
  ICreateWorkflowOverrideResponseDto,
  IPreferenceChannels,
  ITenantEntity,
  OrganizationId,
  WorkflowOverrideId,
} from '@novu/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreferenceChannels } from '../../shared/dtos/preference-channels';
import { WorkflowResponse } from './workflow-response.dto';

export class CreateWorkflowOverrideResponseDto implements ICreateWorkflowOverrideResponseDto {
  @ApiProperty()
  _id: WorkflowOverrideId;

  @ApiProperty()
  _organizationId: OrganizationId;

  @ApiProperty()
  _environmentId: EnvironmentId;

  @ApiProperty()
  _workflowId: string;

  @ApiPropertyOptional({
    type: WorkflowResponse,
  })
  readonly workflow?: WorkflowResponse;

  @ApiProperty()
  _tenantId: string;

  @ApiPropertyOptional()
  readonly tenant?: ITenantEntity;

  @ApiProperty()
  active: boolean;

  @ApiProperty({
    type: PreferenceChannels,
  })
  preferenceSettings: IPreferenceChannels;

  @ApiProperty()
  deleted: boolean;

  @ApiPropertyOptional()
  deletedAt?: string;

  @ApiPropertyOptional()
  deletedBy?: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt?: string;
}
