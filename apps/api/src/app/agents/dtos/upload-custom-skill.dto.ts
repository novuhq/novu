import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsObject, IsString, MaxLength, ValidateNested } from 'class-validator';

/** Hard cap on inline SKILL.md content to bound textarea-paste payloads. */
export const MAX_INLINE_SKILL_CONTENT_LENGTH = 256 * 1024;

/** Discriminator base for {@link GithubSkillSourceDto} / {@link InlineSkillSourceDto}. */
export class BaseSkillSourceDto {
  @ApiProperty({ enum: ['github', 'inline'] })
  @IsIn(['github', 'inline'])
  type: 'github' | 'inline';
}

export class GithubSkillSourceDto extends BaseSkillSourceDto {
  @ApiProperty({ enum: ['github'] })
  @IsIn(['github'])
  type: 'github';

  @ApiProperty({
    description:
      'GitHub repository URL. Supports `https://github.com/{owner}/{repo}`, `.../tree/{ref}`, or `.../tree/{ref}/{path}` to point at a sub-directory containing `SKILL.md`.',
    example: 'https://github.com/anthropics/claude-skills/tree/main/document-skills/pdf',
  })
  @IsNotEmpty()
  @IsString()
  url: string;
}

export class InlineSkillSourceDto extends BaseSkillSourceDto {
  @ApiProperty({ enum: ['inline'] })
  @IsIn(['inline'])
  type: 'inline';

  @ApiProperty({
    description:
      'Raw `SKILL.md` text. Must start with YAML frontmatter declaring a `name` field — Anthropic uses that name as the bundle folder. The pasted content is wrapped server-side as a single-file bundle (`SKILL.md` at the root) before being forwarded to the provider.',
    example:
      '---\nname: my-pdf-skill\ndescription: A PDF helper skill.\n---\n\n# My PDF Skill\n\nInstructions go here.\n',
    maxLength: MAX_INLINE_SKILL_CONTENT_LENGTH,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(MAX_INLINE_SKILL_CONTENT_LENGTH)
  content: string;
}

@ApiExtraModels(GithubSkillSourceDto, InlineSkillSourceDto)
export class UploadCustomSkillRequestDto {
  @ApiProperty({
    description: 'ID of an existing managed-runtime integration whose API key should be used for the upload.',
  })
  @IsNotEmpty()
  @IsString()
  integrationId: string;

  @ApiProperty({
    description:
      'Source of the skill bundle. Either a public GitHub repository URL (`type: "github"`) or raw `SKILL.md` text pasted inline (`type: "inline"`).',
    oneOf: [{ $ref: getSchemaPath(GithubSkillSourceDto) }, { $ref: getSchemaPath(InlineSkillSourceDto) }],
    discriminator: {
      propertyName: 'type',
      mapping: {
        github: getSchemaPath(GithubSkillSourceDto),
        inline: getSchemaPath(InlineSkillSourceDto),
      },
    },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => BaseSkillSourceDto, {
    discriminator: {
      property: 'type',
      subTypes: [
        { name: 'github', value: GithubSkillSourceDto },
        { name: 'inline', value: InlineSkillSourceDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  source: GithubSkillSourceDto | InlineSkillSourceDto;
}

export class UploadCustomSkillResponseDto {
  @ApiProperty({
    description: 'Stable provider-assigned skill identifier. Use as `skills: [{ type: "custom", skillId }]`.',
    example: 'skill_01ABCDEFGHIJ',
  })
  skillId: string;

  @ApiPropertyOptional({
    description:
      'Latest version identifier returned by the provider, when available. ' +
      'Bumps when re-uploading the same source onto an existing skill.',
    example: '1759178010641129',
    nullable: true,
  })
  version?: string | null;
}
