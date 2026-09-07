import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload } from '@novu/application-generic';
import { ConnectionMode, ContextPayload } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsDefined, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AuthDto, WorkspaceDto } from './shared.dto';

export class CreateChannelConnectionRequestDto {
  @ApiPropertyOptional({
    description:
      'The unique identifier for the channel connection. If not provided, one will be generated automatically.',
    type: String,
    example: 'slack-prod-user123-abc4',
  })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({
    description: 'The subscriber ID to link the channel connection to',
    type: String,
    example: 'subscriber-123',
  })
  @IsOptional()
  @IsString()
  subscriberId?: string;

  @ApiContextPayload()
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

  @ApiPropertyOptional({
    description:
      'Connection mode that determines how the channel connection is scoped. ' +
      'Use "subscriber" (default) to associate the connection with a specific subscriber. ' +
      'Use "shared" to associate the connection with a context instead of a subscriber — ' +
      'subscriberId will not be stored on the connection.',
    enum: ['subscriber', 'shared'],
    example: 'shared',
  })
  @IsOptional()
  @IsString()
  @IsIn(['subscriber', 'shared'])
  connectionMode?: ConnectionMode;

  @ApiProperty({
    description: 'The identifier of the integration to use for this channel connection.',
    type: String,
    example: 'slack-prod',
  })
  @IsString()
  @IsDefined()
  integrationIdentifier: string;

  @ApiProperty({ type: WorkspaceDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => WorkspaceDto)
  workspace: WorkspaceDto;

  @ApiProperty({ type: AuthDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => AuthDto)
  auth: AuthDto;
}
