import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum, IntegrationKindEnum } from '@novu/shared';
import { ConfigurationsDto } from './configurations.dto';
import { CredentialsDto } from './credentials.dto';
import { StepFilterDto } from './step-filter-dto';

export class IntegrationResponseDto {
  @ApiPropertyOptional({
    description: 'The unique identifier of the integration record in the database. This is automatically generated.',
    type: String,
  })
  _id?: string;

  @ApiProperty({
    description:
      'The unique identifier for the environment associated with this integration. This links to the Environment collection.',
    type: String,
  })
  _environmentId: string;

  @ApiProperty({
    description:
      'The unique identifier for the organization that owns this integration. This links to the Organization collection.',
    type: String,
  })
  _organizationId: string;

  @ApiProperty({
    description: 'The name of the integration, which is used to identify it in the user interface.',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'A unique string identifier for the integration, often used for API calls or internal references.',
    type: String,
  })
  identifier: string;

  @ApiProperty({
    description: 'The identifier for the provider of the integration (e.g., "mailgun", "twilio").',
    type: String,
  })
  providerId: string;

  @ApiPropertyOptional({
    description:
      'The channel type for the integration, which defines how it communicates (e.g., email, SMS). Not set for agent-kind integrations.',
    enum: ChannelTypeEnum,
  })
  channel?: ChannelTypeEnum;

  @ApiPropertyOptional({
    description:
      'Distinguishes delivery integrations from agent-runtime integrations. Defaults to "delivery". Agent integrations do not have a channel.',
    enum: IntegrationKindEnum,
  })
  kind?: IntegrationKindEnum;

  @ApiPropertyOptional({
    description:
      'The decrypted credentials required for the integration to function (e.g. provider API keys, signing secrets). ' +
      'Only returned to dashboard/session-token callers; API-key authenticated callers receive the integration ' +
      'metadata without this field to avoid amplifying API-key leaks into provider-credential leaks.',
    type: () => CredentialsDto,
  })
  credentials?: CredentialsDto;

  @ApiPropertyOptional({
    description: 'The configurations required for enabling the additional configurations of the integration.',
    type: () => ConfigurationsDto,
  })
  configurations?: ConfigurationsDto;

  @ApiProperty({
    description:
      'Indicates whether the integration is currently active. An active integration will process events and messages.',
    type: Boolean,
  })
  active: boolean;

  @ApiProperty({
    description: 'Indicates whether the integration has been marked as deleted (soft delete).',
    type: Boolean,
  })
  deleted: boolean;

  @ApiPropertyOptional({
    description:
      'The timestamp indicating when the integration was deleted. This is set when the integration is soft deleted.',
    type: String,
  })
  deletedAt?: string;

  @ApiPropertyOptional({
    description: 'The identifier of the user who performed the deletion of this integration. Useful for audit trails.',
    type: String,
  })
  deletedBy?: string;

  @ApiProperty({
    description:
      'Indicates whether this integration is marked as primary. A primary integration is often the default choice for processing.',
    type: Boolean,
  })
  primary: boolean;

  @ApiPropertyOptional({
    description:
      'An array of conditions associated with the integration that may influence its behavior or processing logic.',
    type: [StepFilterDto],
  })
  conditions?: StepFilterDto[];
}
