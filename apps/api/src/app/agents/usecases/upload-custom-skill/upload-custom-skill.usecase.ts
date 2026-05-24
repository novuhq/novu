import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  decryptCredentials,
  getAgentRuntimeProvider,
  type IAgentRuntimeProvider,
  PinoLogger,
  type UploadSkillFile,
} from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';

import type { UploadCustomSkillSourceType } from '../../dtos/upload-custom-skill.dto';
import {
  assertRepoSlug,
  buildRepoSkillDisplayTitle,
  buildSkillDisplayTitle,
  type DiscoveredSkillBundle,
  fetchAndDiscoverSkillBundles,
  fetchAndExtractSkillBundle,
  parseGithubUrl,
  parseSkillNameFromFrontmatter,
} from '../../utils/github-skill-bundle';
import { buildInlineSkillBundle } from '../../utils/inline-skill-bundle';
import { UploadCustomSkillCommand, type UploadCustomSkillSource } from './upload-custom-skill.command';

export type UploadedSkillEntry = {
  skillId: string;
  version: string | null;
  source: {
    type: UploadCustomSkillSourceType;
    path?: string;
    name?: string;
  };
};

export type UploadCustomSkillResult = {
  skills: UploadedSkillEntry[];
};

type ResolvedSkillBundle = {
  files: UploadSkillFile[];
  displayTitle: string | undefined;
  source: UploadedSkillEntry['source'];
};

@Injectable()
export class UploadCustomSkill {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: UploadCustomSkillCommand): Promise<UploadCustomSkillResult> {
    const integration = await this.integrationRepository.findOne(
      {
        _id: command.integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'credentials', 'providerId']
    );

    if (!integration) {
      throw new NotFoundException(`Integration "${command.integrationId}" not found.`);
    }

    const decryptedCredentials = decryptCredentials(integration.credentials);

    if (!decryptedCredentials.apiKey) {
      throw new UnprocessableEntityException(
        `Integration "${command.integrationId}" has no API key configured. Please complete the integration setup.`
      );
    }

    const bundles = await this.resolveBundles(command.source);

    const provider = getAgentRuntimeProvider(integration.providerId, decryptedCredentials.apiKey);
    const uploaded = await this.uploadBundlesStrict(provider, bundles);

    this.logger.info(
      {
        integrationId: command.integrationId,
        providerId: integration.providerId,
        sourceType: command.source.type,
        uploaded: uploaded.length,
      },
      'Uploaded custom skill(s)'
    );

    return { skills: uploaded };
  }

  private async resolveBundles(source: UploadCustomSkillSource): Promise<ResolvedSkillBundle[]> {
    switch (source.type) {
      case 'github-url': {
        const parsed = this.parseSourceUrl(source.url);
        const files = await this.fetchSingleBundle(parsed);
        const name = this.readBundleName(files);

        return [
          {
            files,
            displayTitle: buildSkillDisplayTitle(parsed),
            source: {
              type: 'github-url',
              path: parsed.subPath.length > 0 ? parsed.subPath : undefined,
              name: name ?? undefined,
            },
          },
        ];
      }
      case 'github-repo': {
        const { owner, repo } = this.parseRepoSlug(source.repo);

        if (!source.skills?.length) {
          throw new BadRequestException('At least one skill name is required for `github-repo` uploads.');
        }

        const discovered = await this.fetchMultipleBundles({ owner, repo, ref: 'HEAD', subPath: '' }, source.skills);

        return discovered.map((bundle) => ({
          files: bundle.files,
          displayTitle: buildRepoSkillDisplayTitle(owner, repo, bundle.path),
          source: {
            type: 'github-repo',
            path: bundle.path.length > 0 ? bundle.path : undefined,
            name: bundle.name ?? undefined,
          },
        }));
      }
      case 'inline': {
        const inline = buildInlineSkillBundle(source.content);

        return [
          {
            files: inline.files,
            displayTitle: inline.displayTitle,
            source: {
              type: 'inline',
              name: inline.name ?? undefined,
            },
          },
        ];
      }
      default: {
        const exhaustiveCheck: never = source;
        throw new BadRequestException(`Unsupported skill source type: ${JSON.stringify(exhaustiveCheck)}`);
      }
    }
  }

  /**
   * Uploads bundles sequentially, in input order. The first per-skill failure
   * aborts the batch with no rollback — already-uploaded skills remain on the
   * provider. Subsequent re-uploads will auto-version them (see Anthropic's
   * `isDuplicateDisplayTitleError` branch in the provider).
   */
  private async uploadBundlesStrict(
    provider: IAgentRuntimeProvider,
    bundles: ResolvedSkillBundle[]
  ): Promise<UploadedSkillEntry[]> {
    const results: UploadedSkillEntry[] = [];

    for (const bundle of bundles) {
      const result = await provider.uploadSkill({
        files: bundle.files,
        displayTitle: bundle.displayTitle,
      });

      results.push({
        skillId: result.skillId,
        version: result.version,
        source: bundle.source,
      });
    }

    return results;
  }

  private parseSourceUrl(url: string) {
    try {
      return parseGithubUrl(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid GitHub URL.';
      throw new BadRequestException(`Invalid GitHub URL: ${message}`);
    }
  }

  private parseRepoSlug(repo: string) {
    try {
      return assertRepoSlug(repo);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid GitHub repository slug.';
      throw new BadRequestException(`Invalid GitHub repository slug: ${message}`);
    }
  }

  private async fetchSingleBundle(parsed: { owner: string; repo: string; ref: string; subPath: string }) {
    try {
      return await fetchAndExtractSkillBundle(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch skill bundle from GitHub.';
      if (/rate limit/i.test(message)) {
        this.logger.warn(
          { repo: `${parsed.owner}/${parsed.repo}` },
          `GitHub API rate limit hit — ${message}. Set GITHUB_API_TOKEN to a fine-grained PAT (public repository read) to raise the limit to 5,000 req/hr.`
        );
      }
      throw new BadRequestException(message);
    }
  }

  private async fetchMultipleBundles(
    parsed: { owner: string; repo: string; ref: string; subPath: string },
    basenames: string[]
  ): Promise<DiscoveredSkillBundle[]> {
    try {
      return await fetchAndDiscoverSkillBundles(parsed, basenames);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to discover skill bundles.';
      if (/rate limit/i.test(message)) {
        this.logger.warn(
          { repo: `${parsed.owner}/${parsed.repo}` },
          `GitHub API rate limit hit — ${message}. Set GITHUB_API_TOKEN to a fine-grained PAT (public repository read) to raise the limit to 5,000 req/hr.`
        );
      }
      throw new BadRequestException(message);
    }
  }

  private readBundleName(files: UploadSkillFile[]): string | null {
    const skillMd = files.find((f) => f.path === 'SKILL.md');

    if (!skillMd) {
      return null;
    }

    return parseSkillNameFromFrontmatter(skillMd.content.toString('utf8'));
  }
}
