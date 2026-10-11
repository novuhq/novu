import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { isClerkEnabled } from '@novu/shared';

export const HUMAN_BACKING_EMAIL_DOMAIN = 'users.gethuman.md';

export interface HumanBackingAccount {
  clerkUserId: string;
  clerkOrganizationId: string;
  novuUserId: string;
}

export interface FoundHumanBackingAccount {
  clerkUserId: string;
  clerkOrganizationId?: string;
}

interface Executable<TResult> {
  execute(command: unknown): Promise<TResult>;
}

interface EnterpriseUsecases {
  find: Executable<FoundHumanBackingAccount | null>;
  findOrCreate: Executable<HumanBackingAccount>;
  delete: Executable<boolean>;
  commands: {
    find: { create(data: object): unknown };
    findOrCreate: { create(data: object): unknown };
    delete: { create(data: object): unknown };
  };
}

/**
 * The made-up email of the hidden Novu user behind a Human account. Nobody reads its mailbox,
 * so Novu never emails the operator, and it can't clash with a real Novu account.
 */
export function buildHumanBackingEmail(humanUserId: string): string {
  return `${humanUserId.toLowerCase()}@${HUMAN_BACKING_EMAIL_DOMAIN}`;
}

/**
 * Bridge to the enterprise use cases that manage the hidden Clerk user and organization behind a
 * Human account (its backing organization). They only exist when Novu runs with Clerk (Novu Cloud);
 * everywhere else `isAvailable()` is false and the Human account endpoints answer 404.
 */
@Injectable()
export class HumanBackingAccounts {
  private enterprise: EnterpriseUsecases | null | undefined;

  constructor(private readonly moduleRef: ModuleRef) {}

  isAvailable(): boolean {
    return this.resolveEnterprise() !== null;
  }

  findOrCreate(params: { humanUserId: string; firstName?: string; lastName?: string }): Promise<HumanBackingAccount> {
    const { findOrCreate, commands } = this.requireEnterprise();

    return findOrCreate.execute(
      commands.findOrCreate.create({ ...params, email: buildHumanBackingEmail(params.humanUserId) })
    );
  }

  find(humanUserId: string): Promise<FoundHumanBackingAccount | null> {
    const { find, commands } = this.requireEnterprise();

    return find.execute(commands.find.create({ humanUserId, email: buildHumanBackingEmail(humanUserId) }));
  }

  delete(humanUserId: string): Promise<boolean> {
    const { delete: deleteAccount, commands } = this.requireEnterprise();

    return deleteAccount.execute(commands.delete.create({ humanUserId, email: buildHumanBackingEmail(humanUserId) }));
  }

  private requireEnterprise(): EnterpriseUsecases {
    const enterprise = this.resolveEnterprise();
    if (!enterprise) {
      throw new Error('Human accounts need the Clerk-backed enterprise auth package');
    }

    return enterprise;
  }

  private resolveEnterprise(): EnterpriseUsecases | null {
    if (this.enterprise !== undefined) {
      return this.enterprise;
    }

    this.enterprise = null;

    if (!isClerkEnabled()) {
      return this.enterprise;
    }

    try {
      // nx-ignore-next-line
      const eeAuth = require('@novu/ee-auth');

      this.enterprise = {
        find: this.moduleRef.get(eeAuth.FindHumanBackingAccount, { strict: false }),
        findOrCreate: this.moduleRef.get(eeAuth.FindOrCreateHumanBackingAccount, { strict: false }),
        delete: this.moduleRef.get(eeAuth.DeleteHumanBackingAccount, { strict: false }),
        commands: {
          find: eeAuth.FindHumanBackingAccountCommand,
          findOrCreate: eeAuth.FindOrCreateHumanBackingAccountCommand,
          delete: eeAuth.DeleteHumanBackingAccountCommand,
        },
      };
    } catch {
      this.enterprise = null;
    }

    return this.enterprise;
  }
}
