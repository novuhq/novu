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
  discoverSkillBundles,
  downloadGithubTarball,
  extractSkillBundle,
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
        const tarball = await this.downloadTarball(parsed);
        const files = await this.extractFiles(tarball, parsed.subPath);
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
        const tarball = await this.downloadTarball({ owner, repo, ref: 'HEAD', subPath: '' });
        const discovered = await this.discoverBundles(tarball, source.skills);

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

  private async downloadTarball(parsed: { owner: string; repo: string; ref: string; subPath: string }) {
    try {
      return await downloadGithubTarball(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download GitHub tarball.';
      throw new BadRequestException(message);
    }
  }

  private async extractFiles(tarball: Buffer, subPath: string) {
    try {
      return await extractSkillBundle(tarball, subPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to extract skill bundle.';
      throw new BadRequestException(message);
    }
  }

  private async discoverBundles(tarball: Buffer, basenames?: string[]): Promise<DiscoveredSkillBundle[]> {
    try {
      return await discoverSkillBundles(tarball, { basenames });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to discover skill bundles.';
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
