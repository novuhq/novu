import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsNumber } from 'class-validator';

export class DeleteNotificationGroupResponseDto {
  @ApiProperty()
  @IsBoolean()
  @IsDefined()
  acknowledged: boolean;

  @ApiProperty()
  @IsNumber()
  @IsDefined()
  deletedCount: number;
}
