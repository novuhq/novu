import { AnalyticsBrowser } from '@segment/analytics-next';
import { IUserEntity } from '@novu/shared';
import { api } from '../api';

export class SegmentService {
  private _segment: AnalyticsBrowser | null = null;
  private _segmentEnabled: boolean;

  constructor() {
    this._segmentEnabled = !!process.env.REACT_APP_SEGMENT_KEY;

    if (this._segmentEnabled) {
      this._segment = AnalyticsBrowser.load({ writeKey: process.env.REACT_APP_SEGMENT_KEY as string });
    }
  }

  identify(user: IUserEntity) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    this._segment?.identify(user?._id);
  }

  async track(event: string, data?: Record<string, unknown>) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    await api.post('/v1/telemetry/measure', {
      event: event + ' - [WEB]',
      data,
    });
  }

  pageView(url: string) {
    if (!this.isSegmentEnabled()) {
      return;
    }

    this._segment?.pageView(url);
  }

  reset() {
    if (!this.isSegmentEnabled()) {
      return;
    }

    this._segment?.reset();
  }

  isSegmentEnabled(): boolean {
    return this._segmentEnabled && this._segment !== null && typeof window !== 'undefined';
  }
}
