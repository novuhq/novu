import type { IOrganizationEntity, IUserEntity } from '@novu/shared';

type SnitcherIdentifyTraits = Record<string, unknown>;

type SnitcherGlobal = {
  identify: (email: string, traits?: SnitcherIdentifyTraits) => void;
  track?: (event: string, properties?: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    Snitcher?: SnitcherGlobal;
  }
}

export class SnitcherService {
  private get _snitcher(): SnitcherGlobal | undefined {
    if (typeof window === 'undefined') return undefined;

    return window.Snitcher;
  }

  identify(user: IUserEntity, organization?: IOrganizationEntity, extraTraits?: SnitcherIdentifyTraits) {
    if (!this.isEnabled() || !user?.email) return;

    const traits: SnitcherIdentifyTraits = {
      name: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined,
      first_name: user.firstName,
      last_name: user.lastName,
      user_id: user._id,
      ...(organization
        ? {
            company: organization.name,
            company_id: organization._id,
            plan: organization.apiServiceLevel,
            organization_created_at: organization.createdAt,
          }
        : {}),
      ...(extraTraits || {}),
    };

    try {
      this._snitcher?.identify(user.email, traits);
    } catch (error) {
      console.error('Snitcher identify failed', error);
    }
  }

  track(event: string, properties?: Record<string, unknown>) {
    if (!this.isEnabled()) return;

    try {
      this._snitcher?.track?.(event, properties);
    } catch (error) {
      console.error('Snitcher track failed', error);
    }
  }

  isEnabled(): boolean {
    return typeof window !== 'undefined' && typeof this._snitcher?.identify === 'function';
  }
}
