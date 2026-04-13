import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AgentsEarlyAccessDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}
