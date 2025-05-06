import { IsBoolean, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { TriggerEventStatusEnum } from '@novu/shared';
import { ApiProperty } from '@nestjs/swagger';

export class TriggerEventResponseDto {
  @ApiProperty({
    description: 'Indicates whether the trigger was acknowledged or not',
    type: Boolean,
  })
  @IsBoolean()
  @IsDefined()
  acknowledged: boolean;

  @ApiProperty({
    description: 'Status of the trigger',
    enum: TriggerEventStatusEnum,
  })
  @IsDefined()
  @IsEnum(TriggerEventStatusEnum)
  status: TriggerEventStatusEnum;

  @ApiProperty({
    description: 'In case of an error, this field will contain the error message(s)',
    type: [String], // Specify that this is an array of strings
    required: false, // Not required since it's optional
  })
  @IsOptional()
  error?: string[];

  @ApiProperty({
    description: 'The returned transaction ID of the trigger',
    type: String, // Specify that this is a string
    required: false, // Not required since it's optional
  })
  @IsOptional()
  @IsString()
  transactionId?: string;
}
