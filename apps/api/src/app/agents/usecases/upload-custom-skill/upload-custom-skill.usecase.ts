import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  decryptCredentials,
  getAgentRuntimeProvider,
  PinoLogger,
  type UploadSkillFile,
} from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';

import {
  buildSkillDisplayTitle,
  downloadGithubTarball,
  extractSkillBundle,
  parseGithubUrl,
} from '../../utils/github-skill-bundle';
import { buildInlineSkillBundle } from '../../utils/inline-skill-bundle';
import { UploadCustomSkillCommand, type UploadCustomSkillSource } from './upload-custom-skill.command';

export type UploadCustomSkillResult = {
  skillId: string;
  /** Latest version identifier returned by the provider, when available. */
  version: string | null;
};

type ResolvedSkillBundle = {
  files: UploadSkillFile[];
  displayTitle: string | undefined;
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

    const bundle = await this.resolveBundle(command.source);

    const provider = getAgentRuntimeProvider(integration.providerId, decryptedCredentials.apiKey);

    const result = await provider.uploadSkill({
      files: bundle.files,
      displayTitle: bundle.displayTitle,
    });

    this.logger.info(
      {
        integrationId: command.integrationId,
        providerId: integration.providerId,
        sourceType: command.source.type,
        skillId: result.skillId,
        version: result.version,
      },
      'Uploaded custom skill'
    );

    return { skillId: result.skillId, version: result.version };
  }

  private async resolveBundle(source: UploadCustomSkillSource): Promise<ResolvedSkillBundle> {
    switch (source.type) {
      case 'github': {
        const parsed = this.parseSourceUrl(source.url);
        const tarball = await this.downloadTarball(parsed);
        const files = await this.extractFiles(tarball, parsed.subPath);

        return { files, displayTitle: buildSkillDisplayTitle(parsed) };
      }
      case 'inline':
        return buildInlineSkillBundle(source.content);
      default: {
        // Exhaustiveness check — class-validator should have rejected unknown
        // discriminators before this line, but the compiler can't prove that.
        const exhaustiveCheck: never = source;
        throw new BadRequestException(`Unsupported skill source type: ${JSON.stringify(exhaustiveCheck)}`);
      }
    }
  }

  private parseSourceUrl(url: string) {
    try {
      return parseGithubUrl(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid GitHub URL.';
      throw new BadRequestException(`Invalid GitHub URL: ${message}`);
    }
  }

  private async downloadTarball(parsed: ReturnType<typeof parseGithubUrl>) {
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
}
