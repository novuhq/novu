import { BaseCommand } from '@novu/application-generic';
import { CLI_USER_CODE_PATTERN } from '@novu/shared';
import { IsString, Matches } from 'class-validator';

/** Names a `human login` by the code its terminal shows, for looking it up or denying it. */
export class HumanCliLoginCommand extends BaseCommand {
  @IsString()
  @Matches(CLI_USER_CODE_PATTERN)
  userCode: string;
}
