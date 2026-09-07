import { IsDefined } from 'class-validator';

export class CreateVercelIntegrationResponseDto {
  @IsDefined()
  success: boolean;
}
