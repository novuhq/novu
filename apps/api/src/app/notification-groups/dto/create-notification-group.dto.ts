import { IsArray, IsDefined, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class CreateNotificationGroupDto {
  @IsString()
  @IsDefined()
  name: string;
}
