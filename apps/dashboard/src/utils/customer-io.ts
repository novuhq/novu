import { AnalyticsBrowser } from '@customerio/cdp-analytics-browser';
import type { IUserEntity } from '@novu/shared';
import { CUSTOMER_IO_WRITE_KEY } from '@/config';

export class CustomerIoService {
  private _analytics: AnalyticsBrowser | null = null;
  private _enabled: boolean;

  constructor() {
    this._enabled = !!CUSTOMER_IO_WRITE_KEY;

    if (this._enabled) {
      this._analytics = AnalyticsBrowser.load({ writeKey: CUSTOMER_IO_WRITE_KEY as string });
    }
  }

  identify(user: IUserEntity, extraProperties?: Record<string, unknown>) {
    if (!this.isEnabled()) return;

    this._analytics?.identify(user?._id, {
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      avatar: user.profilePicture,
      ...(extraProperties || {}),
    });
  }

  group(organization: { id: string; name: string; createdAt: string }, extraProperties?: Record<string, unknown>) {
    if (!this.isEnabled()) return;

    this._analytics?.group(organization.id, {
      name: organization.name,
      createdAt: organization.createdAt,
      ...(extraProperties || {}),
    });
  }

  reset() {
    if (!this.isEnabled()) return;

    this._analytics?.reset();
  }

  isEnabled(): boolean {
    return this._enabled && this._analytics !== null && typeof window !== 'undefined';
  }
}
