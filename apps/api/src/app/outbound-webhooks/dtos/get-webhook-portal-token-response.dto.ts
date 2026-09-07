import { IsNotEmpty, IsString } from 'class-validator';

export class GetWebhookPortalTokenResponseDto {
  @IsNotEmpty()
  @IsString()
  url: string;

  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  appId: string;
}
