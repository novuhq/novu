import { ApiPropertyOptional } from '@nestjs/swagger';

import { IntegrationResponseDto } from './integration-response.dto';

export class GetActiveIntegrationResponseDto extends IntegrationResponseDto {
  @ApiPropertyOptional()
  selected?: boolean;
}
