import { HumanInteractionKindEnum } from '@novu/shared';
import { IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import type { HumanInteractionCardDto } from '../../dtos/create-interaction-request.dto';
import { InboxThreadCommand } from '../inbox-thread.command';

export class CreateInboxInteractionCommand extends InboxThreadCommand {
  @IsEnum(HumanInteractionKindEnum)
  kind: HumanInteractionKindEnum;

  @IsNotEmpty()
  @IsObject()
  card: HumanInteractionCardDto;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsInt()
  ttlSeconds?: number;
}
