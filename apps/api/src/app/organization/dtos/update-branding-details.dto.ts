import { IsHexColor, IsOptional, IsString, IsUrl } from 'class-validator';
import { IsImageUrl } from '../../shared/validators/image.validator';

const environments = ['production', 'test'];
const protocols = environments.includes(process.env.NODE_ENV) ? ['https'] : ['http', 'https'];
const hostWhitelist = environments.includes(process.env.NODE_ENV) ? undefined : ['localhost', 'web.novu.co'];

export class UpdateBrandingDetailsDto {
  @IsUrl({
    require_protocol: true,
    protocols,
    host_whitelist: hostWhitelist,
  })
  @IsImageUrl({
    message: 'Logo must be a valid image URL with one of the following extensions: jpg, jpeg, png, gif, svg',
  })
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
