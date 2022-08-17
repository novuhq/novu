import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsString } from 'class-validator';

export class DeleteSubscriberResponseDto {
  @ApiProperty({
    description: 'If subscriber was deleted or not',
  })
  @IsBoolean()
  @IsDefined()
  acknowledged: boolean;

  @ApiProperty({
    description: 'Status for subscriber',
    enum: ['deleted'],
  })
  @IsString()
  @IsDefined()
  status: string;
}
