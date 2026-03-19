import { ClientSession } from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import { Exclude } from 'class-transformer';
import { IsEnum, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../commands';

export class DeletePreferencesCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  @IsMongoId()
  readonly templateId: string;

  @IsNotEmpty()
  @IsEnum(PreferencesTypeEnum)
  readonly type: PreferencesTypeEnum;

  /**
   * Exclude session from the command to avoid serializing it in the response
   */
  @IsOptional()
  @Exclude()
  session?: ClientSession | null;
}
