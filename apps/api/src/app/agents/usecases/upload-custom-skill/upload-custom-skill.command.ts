import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import {
  MAX_GITHUB_REPO_SKILLS_PER_REQUEST,
  MAX_INLINE_SKILL_CONTENT_LENGTH,
  type UploadCustomSkillSourceType,
} from '../../dtos/upload-custom-skill.dto';

export class GithubUrlSkillSourceCommand {
  @IsIn(['github-url'])
  type: 'github-url';

  @IsNotEmpty()
  @IsString()
  url: string;
}

export class GithubRepoSkillSourceCommand {
  @IsIn(['github-repo'])
  type: 'github-repo';

  @IsNotEmpty()
  @IsString()
  repo: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_GITHUB_REPO_SKILLS_PER_REQUEST)
  @IsString({ each: true })
  skills: string[];
}

export class InlineSkillSourceCommand {
  @IsIn(['inline'])
  type: 'inline';

  @IsNotEmpty()
  @IsString()
  @MaxLength(MAX_INLINE_SKILL_CONTENT_LENGTH)
  content: string;
}

export type UploadCustomSkillSource =
  | GithubUrlSkillSourceCommand
  | GithubRepoSkillSourceCommand
  | InlineSkillSourceCommand;

/** Discriminator base for command-level `@Type` polymorphism on `source`. */
class BaseSkillSourceCommand {
  @IsIn(['github-url', 'github-repo', 'inline'])
  type: UploadCustomSkillSourceType;
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
        { name: 'github-url', value: GithubUrlSkillSourceCommand },
        { name: 'github-repo', value: GithubRepoSkillSourceCommand },
        { name: 'inline', value: InlineSkillSourceCommand },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  source: UploadCustomSkillSource;
}
