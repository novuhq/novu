export class SubscriberSessionResponseDto {
  readonly token: string;
  readonly totalUnreadCount: number;
  readonly removeNovuBranding: boolean;
  readonly maxSnoozeDurationHours: number;
  readonly isDevelopmentMode: boolean;
  readonly applicationIdentifier?: string;
}
