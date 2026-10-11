import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { PinoLogger, StorageService } from '@novu/application-generic';
import { AgentEntity, type AgentPicture, AgentRepository } from '@novu/dal';
import type { HumanAgentResponseDto } from '../dtos/human-agent.dto';
import { HumanAgentIdentityService } from './human-agent-identity.service';

/** Plenty for a picture shown in a small circle, and small enough for every channel to take. */
export const AGENT_PICTURE_MAX_BYTES = 2 * 1024 * 1024;

/** The field of the upload form that holds the file. */
export const AGENT_PICTURE_FIELD = 'picture';

type PictureType = { contentType: 'image/jpeg' | 'image/png'; extension: 'jpg' | 'png' };

const JPEG_START = [0xff, 0xd8, 0xff];
const PNG_START = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * What the file really is, read from its first bytes. The name and the type the uploader claims are
 * not trusted: the picture is later served to anyone who opens an invite.
 */
export function detectPictureType(file: Buffer): PictureType | null {
  if (JPEG_START.every((byte, index) => file[index] === byte)) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }

  if (PNG_START.every((byte, index) => file[index] === byte)) {
    return { contentType: 'image/png', extension: 'png' };
  }

  return null;
}

/** Where anyone can load the agent's picture, or nothing when it has none. */
export function agentPictureUrl(agent: Pick<AgentEntity, '_id' | '_environmentId' | 'picture'>): string | undefined {
  if (!agent.picture?.storageKey) {
    return undefined;
  }

  const base = (process.env.API_ROOT_URL ?? 'https://api.novu.co').replace(/\/$/, '');

  return `${base}/v1/human/agent-pictures/${agent._environmentId}/${agent._id}/${agent.picture.version}`;
}

type AgentScope = { environmentId: string; organizationId: string; agentIdentifier: string };

/**
 * The relay agent's picture: kept in file storage, served from a public address (the invite page is
 * public too), and set on the agent's Telegram bots. A Slack app's icon can only be changed in Slack.
 */
@Injectable()
export class HumanAgentPictureService {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly storageService: StorageService,
    private readonly humanAgentIdentity: HumanAgentIdentityService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** The agent as the Human endpoints report it. */
  describe(agent: AgentEntity): HumanAgentResponseDto {
    const pictureUrl = agentPictureUrl(agent);

    return {
      agentId: agent._id,
      agentIdentifier: agent.identifier,
      name: agent.name,
      ...(agent.description ? { description: agent.description } : {}),
      ...(pictureUrl ? { pictureUrl } : {}),
      active: agent.active !== false,
      createdAt: agent.createdAt,
    };
  }

  /** The relay agent, or a 404 before `human setup` has made it. */
  async get(scope: AgentScope): Promise<HumanAgentResponseDto> {
    return this.describe(await this.findRelay(scope));
  }

  async save(scope: AgentScope, file: Buffer): Promise<AgentEntity> {
    if (file.length > AGENT_PICTURE_MAX_BYTES) {
      throw new PayloadTooLargeException('The picture must be 2 MB or smaller.');
    }

    const type = detectPictureType(file);
    if (!type) {
      throw new BadRequestException('The picture must be a JPEG or a PNG.');
    }

    const agent = await this.findRelay(scope);
    const version = createHash('sha256').update(file).digest('hex').slice(0, 16);
    const picture: AgentPicture = {
      storageKey: `${scope.organizationId}/${scope.environmentId}/agents/${agent._id}/picture-${version}.${type.extension}`,
      contentType: type.contentType,
      version,
    };

    await this.storageService.uploadFile(picture.storageKey, file, picture.contentType);
    await this.agentRepository.updateOne(
      { _id: agent._id, _environmentId: scope.environmentId, _organizationId: scope.organizationId },
      { $set: { picture } }
    );

    if (agent.picture?.storageKey && agent.picture.storageKey !== picture.storageKey) {
      await this.deleteFile(agent.picture.storageKey);
    }

    await this.humanAgentIdentity.updateTelegramBots(agent, { picture });

    return { ...agent, picture };
  }

  async remove(scope: AgentScope): Promise<AgentEntity> {
    const agent = await this.findRelay(scope);
    if (!agent.picture?.storageKey) {
      return agent;
    }

    await this.agentRepository.updateOne(
      { _id: agent._id, _environmentId: scope.environmentId, _organizationId: scope.organizationId },
      { $unset: { picture: 1 } }
    );
    await this.deleteFile(agent.picture.storageKey);
    await this.humanAgentIdentity.updateTelegramBots(agent, { picture: null });

    return { ...agent, picture: undefined };
  }

  /** The file behind a public picture address, or `null` when the address is not (or no longer) a picture. */
  async read(address: {
    environmentId: string;
    agentId: string;
    version: string;
  }): Promise<{ file: Buffer; contentType: string } | null> {
    if (!isObjectId(address.environmentId) || !isObjectId(address.agentId)) {
      return null;
    }

    const agent = await this.agentRepository.findOne({ _id: address.agentId, _environmentId: address.environmentId }, [
      'picture',
      'runtime',
    ]);
    const picture = agent?.runtime === 'human_relay' ? agent.picture : undefined;

    if (!picture?.storageKey || picture.version !== address.version) {
      return null;
    }

    return { file: await this.storageService.getFile(picture.storageKey), contentType: picture.contentType };
  }

  private async findRelay(scope: AgentScope): Promise<AgentEntity> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: scope.agentIdentifier,
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
      },
      '*'
    );

    if (!agent || agent.runtime !== 'human_relay') {
      throw new NotFoundException('There is no Human agent yet. Run `human setup` first.');
    }

    return agent;
  }

  /** A file left behind costs a little storage; it must not fail the change the operator asked for. */
  private async deleteFile(storageKey: string): Promise<void> {
    try {
      await this.storageService.deleteFile(storageKey);
    } catch (err) {
      this.logger.warn({ err, storageKey }, 'Could not delete an old agent picture.');
    }
  }
}

function isObjectId(value: string): boolean {
  return /^[0-9a-f]{24}$/i.test(value);
}
