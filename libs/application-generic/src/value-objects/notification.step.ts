import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { NotificationStepVariantCommand } from './notification-step-variant.command';

export class NotificationStep extends NotificationStepVariantCommand {
  @IsOptional()
  @IsArray()
  @ValidateNested()
  variants?: NotificationStepVariantCommand[];
}
