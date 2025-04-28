export class SubscriberSessionResponseDto {
  readonly token: string;
  readonly totalUnreadCount: number;
  readonly removeNovuBranding: boolean;
  readonly isSnoozeEnabled: boolean;
  readonly isDevelopmentMode: boolean;
}
