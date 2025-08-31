import { ApiProperty } from '@nestjs/swagger';
import { ChatProviderIdEnum } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsDefined, IsEnum, IsNotEmpty, IsString } from 'class-validator';

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
    description: 'Unique identifier of the subscriber',
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty({
    message: 'SubscriberId is required',
  })
  @Transform(({ value }) => value.trim())
  subscriberId: string;
}
