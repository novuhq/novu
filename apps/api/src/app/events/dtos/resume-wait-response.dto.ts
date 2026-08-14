import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDefined } from 'class-validator';

export class ResumeWaitResponseDto {
  @ApiProperty({
    description: 'True when at least one DELAYED Wait job was resumed',
    type: Boolean,
  })
  @IsBoolean()
  @IsDefined()
  resumed: boolean;
}
