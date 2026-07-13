import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
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

/** Hard cap on inline SKILL.md content to bound textarea-paste payloads. */
export const MAX_INLINE_SKILL_CONTENT_LENGTH = 256 * 1024;

/** Maximum number of skill basenames a single `github-repo` request may select. */
export const MAX_GITHUB_REPO_SKILLS_PER_REQUEST = 50;

export type UploadCustomSkillSourceType = 'github-url' | 'github-repo' | 'inline';

/** Discriminator base for {@link GithubUrlSkillSourceDto} / {@link GithubRepoSkillSourceDto} / {@link InlineSkillSourceDto}. */
export class BaseSkillSourceDto {
  @ApiProperty({ enum: ['github-url', 'github-repo', 'inline'] })
  @IsIn(['github-url', 'github-repo', 'inline'])
  type: UploadCustomSkillSourceType;
}

export class GithubUrlSkillSourceDto extends BaseSkillSourceDto {
  @ApiProperty({ enum: ['github-url'] })
  @IsIn(['github-url'])
  type: 'github-url';

  @ApiProperty({
    description:
      'GitHub repository URL. Supports `https://github.com/{owner}/{repo}`, `.../tree/{ref}`, or `.../tree/{ref}/{path}` to point at a sub-directory containing `SKILL.md`. Use this form to upload a single skill or pin a specific ref/SHA.',
    example: 'https://github.com/anthropics/claude-skills/tree/main/document-skills/pdf',
  })
  @IsNotEmpty()
  @IsString()
  url: string;
}

export class GithubRepoSkillSourceDto extends BaseSkillSourceDto {
  @ApiProperty({ enum: ['github-repo'] })
  @IsIn(['github-repo'])
  type: 'github-repo';

  @ApiProperty({
    description:
      'Public GitHub repository slug in `owner/repo` form (no host, no `.git` suffix, no path). The tarball is always fetched from the default branch (`HEAD`) — to pin a ref, use `type: "github-url"` instead.',
    example: 'samber/cc-skills-golang',
  })
  @IsNotEmpty()
  @IsString()
  repo: string;

  @ApiProperty({
    description:
      'List of skill directory basenames to upload from the repository (e.g. `task-coordination-strategies`). ' +
      'Must be non-empty. Each name must match exactly one directory across the repo containing a `SKILL.md`; ' +
      'ambiguous names are rejected with a 400 — use `type: "github-url"` with a `/tree/{ref}/{path}` URL to disambiguate.',
    example: ['task-coordination-strategies', 'fastapi-templates'],
    type: [String],
    minItems: 1,
    maxItems: MAX_GITHUB_REPO_SKILLS_PER_REQUEST,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_GITHUB_REPO_SKILLS_PER_REQUEST)
  @IsString({ each: true })
  skills: string[];
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

@ApiExtraModels(GithubUrlSkillSourceDto, GithubRepoSkillSourceDto, InlineSkillSourceDto)
export class UploadCustomSkillRequestDto {
  @ApiProperty({
    description: 'ID of an existing managed-runtime integration whose API key should be used for the upload.',
  })
  @IsNotEmpty()
  @IsString()
  integrationId: string;

  @ApiProperty({
    description:
      'Source of the skill bundle. One of: a single-skill GitHub URL (`type: "github-url"`), an `owner/repo` slug with one or more required skill basenames (`type: "github-repo"`), or raw `SKILL.md` text pasted inline (`type: "inline"`).',
    oneOf: [
      { $ref: getSchemaPath(GithubUrlSkillSourceDto) },
      { $ref: getSchemaPath(GithubRepoSkillSourceDto) },
      { $ref: getSchemaPath(InlineSkillSourceDto) },
    ],
    discriminator: {
      propertyName: 'type',
      mapping: {
        'github-url': getSchemaPath(GithubUrlSkillSourceDto),
        'github-repo': getSchemaPath(GithubRepoSkillSourceDto),
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
        { name: 'github-url', value: GithubUrlSkillSourceDto },
        { name: 'github-repo', value: GithubRepoSkillSourceDto },
        { name: 'inline', value: InlineSkillSourceDto },
      ],
    },
    keepDiscriminatorProperty: true,
  })
  source: GithubUrlSkillSourceDto | GithubRepoSkillSourceDto | InlineSkillSourceDto;
}

export class UploadedSkillSourceDto {
  @ApiProperty({
    description: 'Type of source the entry was uploaded from.',
    enum: ['github-url', 'github-repo', 'inline'],
  })
  type: UploadCustomSkillSourceType;

  @ApiPropertyOptional({
    description:
      'Repository-relative directory the skill files were extracted from. ' +
      'Present for both GitHub variants when known; omitted for `inline` uploads.',
    example: 'skills/golang-benchmark',
  })
  path?: string;

  @ApiPropertyOptional({
    description: "Value of the `name` field in the bundle's SKILL.md YAML frontmatter, when parseable.",
    example: 'golang-benchmark',
  })
  name?: string;
}

@ApiExtraModels(UploadedSkillSourceDto)
export class UploadedSkillEntryDto {
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

  @ApiProperty({
    description: 'Information about where this skill came from in the original upload request.',
    type: UploadedSkillSourceDto,
  })
  source: UploadedSkillSourceDto;
}

@ApiExtraModels(UploadedSkillEntryDto)
export class UploadCustomSkillResponseDto {
  @ApiProperty({
    description:
      'Skills uploaded by this request. Length is always at least 1; ' +
      'always 1 for `inline` and `github-url` sources, and 1+ for `github-repo` ' +
      'matching the number of `skills` basenames supplied in the request.',
    type: [UploadedSkillEntryDto],
  })
  skills: UploadedSkillEntryDto[];
}
