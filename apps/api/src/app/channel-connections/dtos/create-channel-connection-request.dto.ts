import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { makeResourceKey, RESOURCE, ResourceKey } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';
import { IsResourceKey } from '../../shared/validators/resource-key.validator';
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

  @ApiProperty({
    description: 'The resource of the channel connection',
    type: String,
    example: makeResourceKey(RESOURCE.SUBSCRIBER, 'user123'),
  })
  @IsDefined()
  @IsResourceKey()
  resource: ResourceKey;

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
