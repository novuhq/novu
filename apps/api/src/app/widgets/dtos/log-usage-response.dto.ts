import { ApiProperty } from '@nestjs/swagger';

export class LogUsageResponseDto {
  @ApiProperty()
  success: boolean;
}
