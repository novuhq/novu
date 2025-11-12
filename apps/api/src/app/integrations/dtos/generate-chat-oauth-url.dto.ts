import { ApiProperty } from '@nestjs/swagger';
import { IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsDefined, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiContextPayload } from '../../shared/framework/swagger/context-payload.decorator';

export class GenerateChatOauthUrlRequestDto {
  @ApiProperty({
    type: String,
    description: 'The subscriber ID to link the integration to',
    example: 'subscriber-123',
  })
  @IsOptional()
  @IsString()
  subscriberId?: string;

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

  @ApiContextPayload()
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;
}
