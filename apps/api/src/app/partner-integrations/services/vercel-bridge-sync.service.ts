import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { CommunityUserRepository, MemberRepository } from '@novu/dal';
import { lastValueFrom } from 'rxjs';
import { buildNovuBridgeUrl, resolveVercelProjectAlias } from '../utils/vercel-bridge-url.util';

type ResolveBridgeUrlInput = {
  isProduction: boolean;
  environmentName: string;
  projectId: string;
  teamId: string | null;
  deploymentUrl?: string;
  accessToken?: string;
  requireStableAlias?: boolean;
};

@Injectable()
export class VercelBridgeSyncService {
  constructor(
    private readonly httpService: HttpService,
    private readonly memberRepository: MemberRepository,
    private readonly communityUserRepository: CommunityUserRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async resolveSyncUserId(organizationId: string): Promise<string> {
    const orgOwner = await this.memberRepository.getOrganizationOwnerAccount(organizationId);

    if (!orgOwner) {
      throw new BadRequestException('Organization owner not found');
    }

    const internalUser = await this.communityUserRepository.findOne({ externalId: orgOwner._userId });

    if (!internalUser) {
      throw new BadRequestException('User not found');
    }

    return internalUser._id;
  }

  async resolveBridgeUrl(input: ResolveBridgeUrlInput): Promise<string | undefined> {
    if (!input.isProduction) {
      if (!input.deploymentUrl) {
        return undefined;
      }

      return buildNovuBridgeUrl(input.deploymentUrl);
    }

    if (!input.accessToken) {
      if (input.requireStableAlias) {
        return undefined;
      }

      if (!input.deploymentUrl) {
        return undefined;
      }

      return buildNovuBridgeUrl(input.deploymentUrl);
    }

    try {
      const projectUrl = input.teamId
        ? `${process.env.VERCEL_BASE_URL}/v9/projects/${input.projectId}?teamId=${input.teamId}`
        : `${process.env.VERCEL_BASE_URL}/v9/projects/${input.projectId}`;

      const getDomainsResponse = await lastValueFrom(
        this.httpService.get(projectUrl, {
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      const alias = resolveVercelProjectAlias(getDomainsResponse.data?.targets, input.environmentName);

      if (!alias) {
        if (input.requireStableAlias) {
          return undefined;
        }

        if (!input.deploymentUrl) {
          return undefined;
        }

        return buildNovuBridgeUrl(input.deploymentUrl);
      }

      return buildNovuBridgeUrl(alias);
    } catch (error) {
      this.logger.warn(
        {
          err: error,
          projectId: input.projectId,
          teamId: input.teamId,
        },
        'Failed to resolve stable Vercel production alias'
      );

      if (input.requireStableAlias) {
        return undefined;
      }

      if (!input.deploymentUrl) {
        return undefined;
      }

      return buildNovuBridgeUrl(input.deploymentUrl);
    }
  }
}
