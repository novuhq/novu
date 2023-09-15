import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class DeleteMessageByTransactionIdRequestDto {
  @ApiPropertyOptional({
    enum: ChannelTypeEnum,
    description: 'The channel of the message to be deleted',
  })
  @IsOptional()
  @IsEnum(ChannelTypeEnum)
  channel?: ChannelTypeEnum;

  @ApiProperty({
    description: 'The transactionId of the message to be deleted',
  })
  @IsString()
  transactionId: string;
}
