import { IsDefined, IsString } from 'class-validator';

export class SetVercelConfigurationRequestDto {
  @IsDefined()
  @IsString()
  configurationId: string;
}
