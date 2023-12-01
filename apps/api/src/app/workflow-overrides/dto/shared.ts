import {
  EnvironmentId,
  IPreferenceChannels,
  IWorkflowOverride,
  OrganizationId,
  WorkflowOverrideId,
} from '@novu/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreferenceChannels } from '../../shared/dtos/preference-channels';

export class OverrideResponseDto implements IWorkflowOverride {
  @ApiProperty()
  _id: WorkflowOverrideId;

  @ApiProperty()
  _organizationId: OrganizationId;

  @ApiProperty()
  _environmentId: EnvironmentId;

  @ApiProperty()
  _workflowId: string;

  @ApiProperty()
  _tenantId: string;

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
