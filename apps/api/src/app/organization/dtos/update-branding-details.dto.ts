import { IsHexColor, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateBrandingDetailsDto {
  @IsUrl({ require_tld: false })
  @IsOptional()
  logo: string;

  @IsOptional()
  @IsHexColor()
  color: string;

  @IsOptional()
  @IsHexColor()
  fontColor: string;

  @IsOptional()
  @IsHexColor()
  contentBackground: string;

  @IsOptional()
  @IsString()
  fontFamily?: string;
}
