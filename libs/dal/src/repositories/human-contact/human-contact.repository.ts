import { Injectable } from '@nestjs/common';
import type { HumanChannelViaEnum } from '@novu/shared';
import { EnforceEnvOrOrgIds, isDuplicateKeyError } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { HumanContactDBModel, HumanContactDefaultSetBy, HumanContactEntity } from './human-contact.entity';
import { HumanContact } from './human-contact.schema';

@Injectable()
export class HumanContactRepository extends BaseRepositoryV2<
  HumanContactDBModel,
  HumanContactEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(HumanContact, HumanContactEntity);
  }

  async findContact(environmentId: string, agentId: string, subscriberId: string): Promise<HumanContactEntity | null> {
    return this.findOne({ _environmentId: environmentId, _agentId: agentId, subscriberId }, '*');
  }

  /**
   * Saves the human's default channel. An inviter's pick (`human invite --via`)
   * never replaces a default the person chose themselves on the invite page.
   */
  async setDefaultVia(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
    via: HumanChannelViaEnum;
    setBy: HumanContactDefaultSetBy;
  }): Promise<void> {
    const filter = {
      _environmentId: params.environmentId,
      _agentId: params.agentId,
      subscriberId: params.subscriberId,
    };

    if (params.setBy === 'inviter') {
      const existing = await this.findOne(filter, ['defaultSetBy']);

      if (existing?.defaultSetBy === 'contact') {
        return;
      }
    }

    try {
      await this.findOneAndUpdate(
        filter,
        {
          $set: { defaultVia: params.via, defaultSetBy: params.setBy },
          $setOnInsert: { _organizationId: params.organizationId },
        },
        { upsert: true }
      );
    } catch (err) {
      // Two first-time writes raced on the unique index; the row now exists, so update it
      // (still never replacing the person's own choice with the inviter's).
      if (!isDuplicateKeyError(err)) {
        throw err;
      }

      await this.findOneAndUpdate(
        params.setBy === 'inviter' ? { ...filter, defaultSetBy: { $ne: 'contact' } } : filter,
        { $set: { defaultVia: params.via, defaultSetBy: params.setBy } }
      );
    }
  }
}
