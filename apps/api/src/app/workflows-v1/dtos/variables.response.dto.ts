import { ApiProperty } from '@nestjs/swagger';

/**
 * @deprecated use dto's in /workflows directory
 */

export class VariablesResponseDto {
  @ApiProperty()
  translations: Record<string, any>;

  @ApiProperty()
  system: Record<string, any>;
}
