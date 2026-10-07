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

  /** The contact of the account owner, when one was recorded. */
  async findOperator(environmentId: string, agentId: string): Promise<HumanContactEntity | null> {
    return this.findOne({ _environmentId: environmentId, _agentId: agentId, isOperator: true }, '*');
  }

  /**
   * Records `subscriberId` as the operator unless the relay agent already has one, and returns whoever
   * the operator is afterwards. The first caller wins; everyone later gets that same contact back.
   */
  async claimOperator(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
  }): Promise<string> {
    const existing = await this.findOperator(params.environmentId, params.agentId);
    if (existing) {
      return existing.subscriberId;
    }

    try {
      await this.findOneAndUpdate(
        { _environmentId: params.environmentId, _agentId: params.agentId, subscriberId: params.subscriberId },
        { $set: { isOperator: true }, $setOnInsert: { _organizationId: params.organizationId } },
        { upsert: true }
      );

      return params.subscriberId;
    } catch (err) {
      // Another request recorded an operator, or created this row, a moment earlier.
      if (!isDuplicateKeyError(err)) {
        throw err;
      }
    }

    const winner = await this.findOperator(params.environmentId, params.agentId);
    if (winner) {
      return winner.subscriberId;
    }

    // The row was only created meanwhile, with no operator recorded yet: mark it now.
    await this.findOneAndUpdate(
      { _environmentId: params.environmentId, _agentId: params.agentId, subscriberId: params.subscriberId },
      { $set: { isOperator: true } }
    );

    return params.subscriberId;
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
