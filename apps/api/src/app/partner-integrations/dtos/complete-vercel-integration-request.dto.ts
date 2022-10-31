import { IsDefined, IsString } from 'class-validator';

export class CompleteVercelIntegrationRequestDto {
  @IsDefined()
  data: Record<string, string[]>;

  @IsDefined()
  @IsString()
  configurationId: string;
}
