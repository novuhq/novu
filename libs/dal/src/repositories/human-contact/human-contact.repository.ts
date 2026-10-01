import { Injectable } from '@nestjs/common';
import type { HumanChannelViaEnum } from '@novu/shared';
import { EnforceEnvOrOrgIds, isDuplicateKeyError } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  HumanContactDBModel,
  HumanContactDefaultSetBy,
  HumanContactEntity,
  HumanContactPendingAddress,
  HumanContactVerifiedAddress,
} from './human-contact.entity';
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

  /**
   * Replaces the pending slot for `via` in one write. The verified slot stays
   * until {@link promotePendingAddress}.
   */
  async upsertPendingAddress(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
    via: HumanChannelViaEnum;
    address: string;
  }): Promise<HumanContactPendingAddress> {
    const filter = {
      _environmentId: params.environmentId,
      _agentId: params.agentId,
      subscriberId: params.subscriberId,
    };
    const pending: HumanContactPendingAddress = {
      address: params.address,
      requestedAt: new Date().toISOString(),
    };
    const pendingPath = `addresses.${params.via}.pending`;

    try {
      await this.findOneAndUpdate(
        filter,
        {
          $set: { [pendingPath]: pending },
          $setOnInsert: { _organizationId: params.organizationId },
        },
        { upsert: true }
      );
    } catch (err) {
      if (!isDuplicateKeyError(err)) {
        throw err;
      }

      await this.findOneAndUpdate(filter, { $set: { [pendingPath]: pending } });
    }

    return pending;
  }

  /**
   * Puts the pending slot back after a failed send. `null` clears it, which is
   * the state before the first request for this channel.
   */
  async restorePendingAddress(params: {
    environmentId: string;
    agentId: string;
    subscriberId: string;
    via: HumanChannelViaEnum;
    pending: HumanContactPendingAddress | null;
  }): Promise<void> {
    const pendingPath = `addresses.${params.via}.pending`;
    const filter = {
      _environmentId: params.environmentId,
      _agentId: params.agentId,
      subscriberId: params.subscriberId,
    };

    if (params.pending) {
      await this.update(filter, { $set: { [pendingPath]: params.pending } });

      return;
    }

    await this.update(filter, { $unset: { [pendingPath]: '' } });
  }

  /**
   * Promotes a matching pending slot to verified and clears pending, in one
   * write. Returns null when that pending address is gone (a superseded link).
   */
  async promotePendingAddress(params: {
    environmentId: string;
    agentId: string;
    subscriberId: string;
    via: HumanChannelViaEnum;
    address: string;
  }): Promise<HumanContactVerifiedAddress | null> {
    const pending = await this.findPendingAddress(
      params.environmentId,
      params.agentId,
      params.subscriberId,
      params.via
    );
    if (pending?.address !== params.address) {
      return null;
    }

    const pendingPath = `addresses.${params.via}.pending`;
    const verified: HumanContactVerifiedAddress = {
      address: pending.address,
      requestedAt: pending.requestedAt,
      verifiedAt: new Date().toISOString(),
    };
    // Matching requestedAt too means a newer request between the read and this write leaves the link superseded.
    const updated = await this.findOneAndUpdate(
      {
        _environmentId: params.environmentId,
        _agentId: params.agentId,
        subscriberId: params.subscriberId,
        [`${pendingPath}.address`]: pending.address,
        [`${pendingPath}.requestedAt`]: pending.requestedAt,
      },
      {
        $set: { [`addresses.${params.via}.verified`]: verified },
        $unset: { [pendingPath]: '' },
      }
    );

    return updated ? verified : null;
  }

  async findVerifiedAddress(
    environmentId: string,
    agentId: string,
    subscriberId: string,
    via: HumanChannelViaEnum
  ): Promise<HumanContactVerifiedAddress | null> {
    const contact = await this.findContact(environmentId, agentId, subscriberId);

    return contact?.addresses?.[via]?.verified ?? null;
  }

  async findPendingAddress(
    environmentId: string,
    agentId: string,
    subscriberId: string,
    via: HumanChannelViaEnum
  ): Promise<HumanContactPendingAddress | null> {
    const contact = await this.findContact(environmentId, agentId, subscriberId);

    return contact?.addresses?.[via]?.pending ?? null;
  }
}
