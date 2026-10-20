import { BaseCommand } from '@novu/application-generic';
import { IsString, Matches } from 'class-validator';
import { HUMAN_USER_ID_PATTERN } from '../../dtos/human-account.dto';

export class DeleteHumanAccountCommand extends BaseCommand {
  @IsString()
  @Matches(HUMAN_USER_ID_PATTERN)
  humanUserId: string;
}
