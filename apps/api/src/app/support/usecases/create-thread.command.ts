import { BaseCommand } from '@novu/application-generic';
import { IsDefined, IsOptional, IsString } from 'class-validator';

export class CreateSupportThreadCommand extends BaseCommand {
  @IsDefined()
  @IsString()
  text: string;

  @IsDefined()
  @IsString()
  email: string;

  @IsDefined()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsDefined()
  @IsString()
  userId: string;
}
