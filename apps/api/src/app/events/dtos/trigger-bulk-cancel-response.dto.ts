import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class TriggerBulkCancelResponseDto {
  @ApiProperty({
    description: 'transaction id for trigger',
  })
  @IsString()
  transactionId: string;

  @ApiProperty({
    description: 'The success of the trigger',
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'In case of an error, this field will contain the error message',
  })
  @IsArray()
  @IsOptional()
  error?: string[];
}
