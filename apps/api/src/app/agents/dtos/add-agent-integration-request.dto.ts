import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddAgentIntegrationRequestDto {
  @ApiProperty({
    description: 'The integration identifier (same as in the integration store), not the internal document _id.',
  })
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;
}
