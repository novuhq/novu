import { IsDefined } from 'class-validator';

export class SetupIntegrationRequestDto {
  @IsDefined()
  vercelIntegrationCode: string;
}
