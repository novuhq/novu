import { IsEmail, IsNotEmpty, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriberEntity } from '@novu/dal';

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class InviteWebhookDto {
  @IsObject()
  @ValidateNested()
  @Type(() => SubscriberEntity)
  subscriber: SubscriberEntity;

  @IsObject()
  payload: { organizationId: string };
}
