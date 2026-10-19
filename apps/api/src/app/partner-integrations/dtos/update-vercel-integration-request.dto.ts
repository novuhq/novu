import { IsDefined, IsString } from 'class-validator';

export class UpdateVercelIntegrationRequestDto {
  @IsDefined()
  data: Record<string, string[]>;

  @IsDefined()
  @IsString()
  configurationId: string;
}
