import { IsJWT, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class GetWebhookPortalTokenResponseDto {
  @IsNotEmpty()
  @IsString()
  @IsUrl({ require_tld: false }) // Allow localhost URLs
  url: string;

  @IsNotEmpty()
  @IsString()
  @IsJWT()
  token: string;

  @IsNotEmpty()
  @IsString()
  appId: string;
}
