import { IsDefined, IsEnum } from 'class-validator';
import { ButtonTypeEnum } from '@novu/shared';

export class ActionTypeRequestDto {
  @IsEnum(ButtonTypeEnum)
  @IsDefined()
  readonly actionType: ButtonTypeEnum;
}
