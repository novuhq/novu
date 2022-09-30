import { IsDefined } from 'class-validator';

export class SetupVercelIntegrationRequestDto {
  @IsDefined()
  vercelIntegrationCode: string;
}
