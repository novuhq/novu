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
    const choice = { defaultVia: params.via, defaultSetBy: params.setBy };

    if (params.setBy === 'contact') {
      try {
        await this.findOneAndUpdate(
          filter,
          { $set: choice, $setOnInsert: { _organizationId: params.organizationId } },
          { upsert: true }
        );
      } catch (err) {
        // A first-time write raced this one on the unique index, so the row exists now.
        if (!isDuplicateKeyError(err)) {
          throw err;
        }

        await this.findOneAndUpdate(filter, { $set: choice });
      }

      return;
    }

    // Two single atomic writes, so the person's own choice is never replaced even if they pick one
    // meanwhile: update the row only when they don't own it, otherwise create it only when it's missing.
    const updated = await this.findOneAndUpdate({ ...filter, defaultSetBy: { $ne: 'contact' } }, { $set: choice });

    if (updated) {
      return;
    }

    try {
      await this.findOneAndUpdate(
        filter,
        { $setOnInsert: { ...choice, _organizationId: params.organizationId } },
        { upsert: true }
      );
    } catch (err) {
      // Someone else created the row first; theirs stands.
      if (!isDuplicateKeyError(err)) {
        throw err;
      }
    }
  }
}
