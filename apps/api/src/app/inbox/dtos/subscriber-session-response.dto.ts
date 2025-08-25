import { SeverityLevelEnum } from '@novu/shared';

type SeverityCounts = {
  [SeverityLevelEnum.HIGH]: number;
  [SeverityLevelEnum.MEDIUM]: number;
  [SeverityLevelEnum.LOW]: number;
  [SeverityLevelEnum.NONE]: number;
};

type UnreadCount = {
  total: number;
  severity: SeverityCounts;
};

export class SubscriberSessionResponseDto {
  readonly token: string;
  /** @deprecated Use unreadCount instead */
  readonly totalUnreadCount: number;
  readonly unreadCount: UnreadCount;
  readonly removeNovuBranding: boolean;
  readonly maxSnoozeDurationHours: number;
  readonly isDevelopmentMode: boolean;
  readonly applicationIdentifier?: string;
}
