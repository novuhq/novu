import { IsDefined, IsOptional, IsString, MaxLength } from 'class-validator';

export class ProviderRequestDto {
  @IsDefined()
  @IsString()
  @MaxLength(100)
  providerName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  useCase?: string;
}
