import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntegrationResponseDto } from '@novu/application-generic';

export class AutoConfigureIntegrationResponseDto {
  @ApiProperty({
    description: 'Indicates whether the auto-configuration was successful',
    type: Boolean,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Optional message describing the result or any errors that occurred',
    type: String,
  })
  message?: string;

  @ApiPropertyOptional({
    description: 'The updated configurations after auto-configuration',
    type: Object,
  })
  integration?: IntegrationResponseDto;
}
