import { ApiProperty } from '@nestjs/swagger';
import { ChatProviderIdEnum, ResourceKey } from '@novu/shared';
import { IsDefined, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { IsResourceKey } from '../../shared/validators/resource-key.validator';

export class GenerateChatOauthUrlRequestDto {
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
    description: 'Provider ID',
    enum: [...Object.values(ChatProviderIdEnum)],
    enumName: 'ChatProviderIdEnum',
    example: 'slack',
  })
  @IsEnum(ChatProviderIdEnum)
  @IsDefined()
  @IsNotEmpty({
    message: 'Provider ID is required',
  })
  providerId: ChatProviderIdEnum;

  @ApiProperty({
    type: String,
    description: 'Resource to link the integration to (e.g. subscriber:123 or context:tenant:123)',
  })
  @IsDefined()
  @IsResourceKey()
  resource: ResourceKey;
}
