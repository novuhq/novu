import { IsDefined, IsString } from 'class-validator';

export class CreateVercelIntegrationRequestDto {
  @IsDefined()
  @IsString()
  vercelIntegrationCode: string;

  @IsDefined()
  @IsString()
  configurationId: string;
}
