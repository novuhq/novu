import { ButtonTypeEnum } from '@novu/shared';
import { IsDefined, IsEnum } from 'class-validator';

export class ActionTypeRequestDto {
  @IsEnum(ButtonTypeEnum)
  @IsDefined()
  readonly actionType: ButtonTypeEnum;
}
