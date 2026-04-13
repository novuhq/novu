import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddAgentIntegrationRequestDto {
  @ApiProperty({
    description: 'The Novu integration document _id to link to this agent.',
  })
  @IsString()
  @IsNotEmpty()
  integrationId: string;
}
