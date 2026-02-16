import { ApiProperty } from '@nestjs/swagger';
import { ButtonTypeEnum } from '@novu/shared';
import { IsDefined, IsEnum } from 'class-validator';

export class SubscriberNotificationActionDto {
  @IsEnum(ButtonTypeEnum)
  @IsDefined()
  @ApiProperty({
    description: 'The type of action button (primary or secondary)',
    enum: ButtonTypeEnum,
    example: ButtonTypeEnum.PRIMARY,
  })
  readonly actionType: ButtonTypeEnum;
}
