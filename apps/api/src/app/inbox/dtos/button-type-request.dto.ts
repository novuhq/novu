import { IsDefined, IsEnum } from 'class-validator';
import { ButtonTypeEnum } from '@novu/shared';

export class ButtonTypeRequestDto {
  @IsEnum(ButtonTypeEnum)
  @IsDefined()
  readonly buttonType: ButtonTypeEnum;
}
