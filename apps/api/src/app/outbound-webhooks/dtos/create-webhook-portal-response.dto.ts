import { ApiProperty } from '@nestjs/swagger';

export class CreateWebhookPortalResponseDto {
  @ApiProperty({
    description: 'The webhook portal application ID',
  })
  appId: string;
}
