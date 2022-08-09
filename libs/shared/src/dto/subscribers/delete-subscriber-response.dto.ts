import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsString } from 'class-validator';

export class DeleteSubscriberResponseDto {
  @ApiProperty()
  @IsBoolean()
  @IsDefined()
  acknowledged: boolean;

  @ApiProperty()
  @IsString()
  @IsDefined()
  status: string;
}
