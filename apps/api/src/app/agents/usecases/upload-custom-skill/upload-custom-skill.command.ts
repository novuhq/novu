import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsObject, IsString, MaxLength, ValidateNested } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { MAX_INLINE_SKILL_CONTENT_LENGTH } from '../../dtos/upload-custom-skill.dto';

export class GithubSkillSourceCommand {
  @IsIn(['github'])
  type: 'github';

  @IsNotEmpty()
  @IsString()
  url: string;
}

export class InlineSkillSourceCommand {
  @IsIn(['inline'])
  type: 'inline';

  @IsNotEmpty()
  @IsString()
  @MaxLength(MAX_INLINE_SKILL_CONTENT_LENGTH)
  content: string;
}

export type UploadCustomSkillSource = GithubSkillSourceCommand | InlineSkillSourceCommand;

/** Discriminator base for command-level `@Type` polymorphism on `source`. */
class BaseSkillSourceCommand {
  @IsIn(['github', 'inline'])
  type: 'github' | 'inline';
}

export class UploadCustomSkillCommand extends EnvironmentWithUserCommand {
  @IsNotEmpty()
  @IsString()
  integrationId: string;

  @IsObject()
  @ValidateNested()
  @Type(() => BaseSkillSourceCommand, {
    discriminator: {
      property: 'type',
      subTypes: [
        { name: 'github', value: GithubSkillSourceCommand },
        { name: 'inline', value: InlineSkillSourceCommand },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  source: UploadCustomSkillSource;
}
