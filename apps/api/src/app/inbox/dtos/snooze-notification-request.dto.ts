import { IsDateString, IsNotEmpty } from 'class-validator';

export class SnoozeNotificationRequestDto {
  @IsDateString()
  @IsNotEmpty()
  snoozeUntil: Date;
}
