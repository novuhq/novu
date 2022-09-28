import { IsDefined } from 'class-validator';

export class SetupIntegrationResponseDto {
  @IsDefined()
  success: boolean;
}
