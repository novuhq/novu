import { ApiProperty } from '@nestjs/swagger';
import { getApiPropertyExamples } from '@novu/application-generic';
import { ChannelEndpointByType, ChannelEndpointType } from '@novu/shared';
import { IsDefined } from 'class-validator';
import { IsValidChannelEndpoint } from '../validators/channel-endpoint.validator';

export class UpdateChannelEndpointRequestDto {
  @ApiProperty({
    description: 'Updated endpoint data specific to the channel type',
    oneOf: getApiPropertyExamples(),
  })
  @IsDefined()
  @IsValidChannelEndpoint()
  endpoint: ChannelEndpointByType[ChannelEndpointType];
}
