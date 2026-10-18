import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  agentInboxHandleCandidates,
  agentInboxIdentitySuffix,
  defaultInboxDomainForProvider,
  isReservedAgentInboxHandle,
  isValidAgentEmailSlugPrefix,
  parseAgentSharedInboxLocalPart,
  preferredAgentInboxHandle,
  resolveAgentInboxDomain,
} from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { EmailProviderIdEnum } from '@novu/shared';

export type InboxAddressCheck = {
  handle: string;
  available: boolean;
  /** A free address close to the one that is taken. Missing when the walk found none. */
  suggestion?: string;
};

export type InboxAddressClaim = {
  handle: string;
  /** The mailbox is not the slug of the name the caller asked for. */
  adjusted: boolean;
};

/**
 * The handle was claimed, or it is reserved. `suggestion` is the nearby free one, when there is one.
 * The HTTP body carries `code: inbox_address_taken` so the onboarding can swap the field.
 */
export class InboxAddressTakenException extends ConflictException {
  constructor(handle: string, suggestion?: string) {
    super({
      message: `${handle} is taken`,
      code: 'inbox_address_taken',
      ...(suggestion ? { suggestion } : {}),
    });
  }
}

/**
 * Whether an Agent Inbox handle is free, and which one to claim.
 * The dashboard asks for an exact handle. The CLI omits it and this walks to a free one.
 * The unique index is what makes the claim stick; this read is the answer shown while typing.
 */
@Injectable()
export class AgentInboxAddressService {
  constructor(private readonly integrationRepository: IntegrationRepository) {}

  async check(handle: string, operatorEmail?: string): Promise<InboxAddressCheck> {
    if (!isValidAgentEmailSlugPrefix(handle)) {
      return { handle, available: false };
    }

    const domain = defaultInboxDomainForProvider(EmailProviderIdEnum.AgentEmailInbox);
    if (!(await this.isHandleTaken(handle, domain))) {
      return { handle, available: true };
    }

    const suggestion = await this.firstFree(handle, operatorEmail, domain, 'nearby');

    return { handle, available: false, ...(suggestion ? { suggestion } : {}) };
  }

  /**
   * The handle to store on a new Agent Inbox. An exact handle that is taken throws
   * {@link InboxAddressTakenException}. With no handle, the name is slugified and a taken
   * one walks to a free neighbour.
   */
  async claim(params: { requestedHandle?: string; name?: string; operatorEmail?: string }): Promise<InboxAddressClaim> {
    const domain = defaultInboxDomainForProvider(EmailProviderIdEnum.AgentEmailInbox);
    const requested = params.requestedHandle?.trim();

    if (requested) {
      if (!isValidAgentEmailSlugPrefix(requested)) {
        throw new BadRequestException('An address takes letters, digits and hyphens.');
      }

      if (await this.isHandleTaken(requested, domain)) {
        throw await this.taken(requested, params.operatorEmail, domain);
      }

      return { handle: requested, adjusted: false };
    }

    const fromName = preferredAgentInboxHandle(params.name);
    if (fromName && !(await this.isHandleTaken(fromName, domain))) {
      return { handle: fromName, adjusted: false };
    }

    const start = fromName ?? agentInboxIdentitySuffix(params.operatorEmail);
    const style = fromName ? 'nearby' : 'number';
    const handle = await this.firstFree(start, params.operatorEmail, domain, style);
    if (!handle) {
      throw await this.taken(start, params.operatorEmail, domain);
    }

    return { handle, adjusted: true };
  }

  async taken(handle: string, operatorEmail: string | undefined, domain: string): Promise<InboxAddressTakenException> {
    const suggestion = await this.firstFree(handle, operatorEmail, domain, 'nearby');

    return new InboxAddressTakenException(handle, suggestion);
  }

  /**
   * Reserved, already claimed as a vanity address on this domain, or equal to a live
   * `{slug}-{key}` local-part on this domain (the trailing key would swallow the mail).
   * A bare `atlas` stays free while `atlas-a1b2c3d4` still belongs to someone else.
   */
  async isHandleTaken(handle: string, domain: string): Promise<boolean> {
    if (isReservedAgentInboxHandle(handle)) {
      return true;
    }

    if (await this.integrationRepository.hasAgentInboundByVanitySlug(handle, domain)) {
      return true;
    }

    const parsed = parseAgentSharedInboxLocalPart(handle);
    if (!parsed) {
      return false;
    }

    const routed = await this.integrationRepository.findAgentInboundByInboxRoutingKey(parsed.inboxRoutingKey);
    if (!routed) {
      return false;
    }

    return resolveAgentInboxDomain(routed.credentials) === domain;
  }

  private async firstFree(
    start: string,
    operatorEmail: string | undefined,
    domain: string,
    style: 'nearby' | 'number'
  ): Promise<string | undefined> {
    for (const candidate of agentInboxHandleCandidates(start, operatorEmail, style)) {
      if (!(await this.isHandleTaken(candidate, domain))) {
        return candidate;
      }
    }

    return undefined;
  }
}
