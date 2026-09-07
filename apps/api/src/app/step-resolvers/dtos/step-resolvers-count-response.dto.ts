import { ApiProperty } from '@nestjs/swagger';

export class StepResolversCountResponseDto {
  @ApiProperty({
    description: 'Number of steps in this environment that use custom code (step resolver)',
    example: 3,
  })
  count: number;
}
