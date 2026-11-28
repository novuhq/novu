import { ApiProperty } from '@nestjs/swagger';
import { IntegrationConnectionStatusEnum, ITestIntegrationConnectionResponse } from '@novu/shared';

export class TestIntegrationConnectionResponseDto implements ITestIntegrationConnectionResponse {
  @ApiProperty({
    enum: IntegrationConnectionStatusEnum,
    enumName: 'IntegrationConnectionStatusEnum',
    description: 'Outcome of the credentials check against the provider.',
  })
  status: IntegrationConnectionStatusEnum;

  @ApiProperty({ type: String, description: 'Human-readable explanation of the outcome.' })
  message: string;

  @ApiProperty({ type: Number, description: 'How many times the provider was called before reaching the result.' })
  attempts: number;
}
