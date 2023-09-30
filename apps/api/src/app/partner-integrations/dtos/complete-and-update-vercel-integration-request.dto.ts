import { IsDefined, IsString } from 'class-validator';

export class CompleteAndUpdateVercelIntegrationRequestDto {
  @IsDefined()
  data: Record<string, string[]>;

  @IsDefined()
  @IsString()
  configurationId: string;
}
