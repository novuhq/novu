import { IsDefined, IsString } from 'class-validator';

export class SetVercelConfigurationRequestDto {
  @IsDefined()
  @IsString()
  vercelIntegrationCode: string;

  @IsDefined()
  @IsString()
  configurationId: string;
}
