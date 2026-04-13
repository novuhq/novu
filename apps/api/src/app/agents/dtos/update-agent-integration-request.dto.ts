import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateAgentIntegrationRequestDto {
  @ApiProperty({
    description: 'The Novu integration document _id this link should point to.',
  })
  @IsString()
  @IsNotEmpty()
  integrationId: string;
}
