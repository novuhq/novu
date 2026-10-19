import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateAgentIntegrationRequestDto {
  @ApiProperty({
    description: 'The integration identifier this link should point to (not the internal document _id).',
  })
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;
}
