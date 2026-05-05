import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString, ValidateNested } from 'class-validator';

export class SendAgentDmMessageDto {
  @ApiProperty({ description: 'Message content in Markdown format' })
  @IsString()
  @IsNotEmpty()
  markdown: string;
}

export class SendAgentDmRequestDto {
  @ApiProperty({ description: 'The identifier of the integration to use for delivery' })
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @ApiProperty({ description: 'The subscriber ID that maps to a linked Slack user endpoint' })
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @ApiProperty({ type: SendAgentDmMessageDto, description: 'Message content to send as a direct message' })
  @IsObject()
  @ValidateNested()
  @Type(() => SendAgentDmMessageDto)
  message: SendAgentDmMessageDto;
}
