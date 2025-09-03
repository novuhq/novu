import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

export class GetChannelConnectionRequestDto {
  @ApiProperty({
    description: 'The identifier of the integration the channel connection belongs to.',
    type: String,
    example: 'slack-prod',
  })
  @IsString()
  @IsDefined()
  integrationIdentifier: string;
}
