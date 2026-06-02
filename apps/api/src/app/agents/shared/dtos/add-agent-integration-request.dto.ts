import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class AddAgentIntegrationRequestDto {
  @ApiPropertyOptional({
    description: 'The integration identifier (same as in the integration store), not the internal document _id.',
  })
  @ValidateIf((o) => !o.providerId)
  @IsString()
  @IsNotEmpty()
  integrationIdentifier?: string;

  @ApiPropertyOptional({
    description:
      'Provider ID to auto-create a dedicated integration (e.g. novu-agent-email). ' +
      'When set, the server creates the integration if one does not already exist for this agent.',
  })
  @ValidateIf((o) => !o.integrationIdentifier)
  @IsString()
  @IsNotEmpty()
  providerId?: string;
}
