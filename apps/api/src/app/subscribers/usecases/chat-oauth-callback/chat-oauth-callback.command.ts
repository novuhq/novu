import { BaseCommand } from '@novu/application-generic';
import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { ChatProviderIdEnum } from '@novu/shared';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function IsNotEmpty(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotEmpty',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return ![null, undefined, 'null', 'undefined', ''].some((invalidValue) => invalidValue === value);
        },
        defaultMessage: function (data) {
          const value = data?.value === '' ? 'empty string' : data?.value;

          return `${data?.property} should not be ${value}`;
        },
      },
    });
  };
}

export class ChatOauthCallbackCommand extends BaseCommand {
  @IsMongoId()
  @IsString()
  readonly environmentId: string;

  @IsNotEmpty()
  @IsEnum(ChatProviderIdEnum)
  readonly providerId: ChatProviderIdEnum;

  @IsNotEmpty()
  @IsString()
  readonly subscriberId: string;

  @IsNotEmpty()
  @IsString()
  readonly providerCode: string;

  readonly hmacHash?: string;

  @IsOptional()
  @IsString()
  readonly integrationIdentifier?: string;
}
