import { IsDefined } from 'class-validator';

export class SetupVercelIntegrationResponseDto {
  @IsDefined()
  success: boolean;
}
