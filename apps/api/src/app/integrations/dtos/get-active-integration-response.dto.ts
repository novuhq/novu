import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum } from '@novu/shared';
import { CredentialsDto } from './credentials.dto';
import { IntegrationResponseDto } from './integration-response.dto';

export class GetActiveIntegrationResponseDto extends IntegrationResponseDto {
  @ApiProperty()
  selected: boolean;
}
