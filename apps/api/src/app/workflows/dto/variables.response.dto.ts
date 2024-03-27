import { ApiProperty } from '@nestjs/swagger';

export class VariablesResponseDto {
  @ApiProperty()
  translations: Record<string, any>;

  @ApiProperty()
  system: Record<string, any>;
}
