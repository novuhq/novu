import { IsDefined } from 'class-validator';

export class SetupVercelConfigurationResponseDto {
  @IsDefined()
  success: boolean;
}
