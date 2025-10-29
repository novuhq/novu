import { ApiProperty } from '@nestjs/swagger';
import { makeResourceKey, RESOURCE, ResourceKey } from '@novu/shared';
import { IsDefined, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsResourceKey } from '../../shared/validators/resource-key.validator';

export class GenerateChatOauthUrlRequestDto {
  @ApiProperty({
    type: String,
    description: 'Resource key',
    example: makeResourceKey(RESOURCE.SUBSCRIBER, 'user123'),
  })
  @IsResourceKey()
  resource: ResourceKey;

  @ApiProperty({
    type: String,
    description: 'Integration identifier',
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty({
    message: 'Integration identifier is required',
  })
  integrationIdentifier: string;

  @ApiProperty({
    type: String,
    description: 'Identifier of the channel connection that will be created',
  })
  @IsString()
  @IsOptional()
  connectionIdentifier?: string;
}
