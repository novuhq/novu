import type { ChannelChoice } from '../../types';
import type { ConnectStore } from '../store';

const CHANNEL_TINTS: Record<ChannelChoice, string> = {
  slack: '#ECB22E', // Slack yellow
  telegram: '#26A5E4', // Telegram blue
  email: '#34A853', // generic mail green
  whatsapp: '#25D366', // WhatsApp green
  teams: '#5059C9', // Teams indigo
  skip: 'white',
};
const DEFAULT_ORB_COLOR = 'white';
const PREVIEW_ORB_COLOR = '#c084fc';

const CHANNEL_LABELS: Partial<Record<ChannelChoice, string>> = {
  slack: 'SLACK',
  telegram: 'TELEGRAM',
  email: 'EMAIL',
  whatsapp: 'WHATSAPP',
  teams: 'TEAMS',
};

function lerpHexColor(from: string, to: string, amount: number): string {
  const clamped = Math.min(1, Math.max(0, amount));
  const fromRgb = parseHexColor(from);
  const toRgb = parseHexColor(to);
  const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * clamped);
  const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * clamped);
  const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * clamped);

  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return { r: 255, g: 255, b: 255 };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, '0');
}

/**
 * Derive the orb's colour from the current phase plus, for the picker only,
 * the channel currently being hovered.
 */
export function computeOrbTint(
  phase: ReturnType<ConnectStore['phase']['get']>,
  hoveredChannel: ChannelChoice | null,
  previewMorphProgress: number | null
): string {
  switch (phase.kind) {
    case 'pick-channel':
      return hoveredChannel ? CHANNEL_TINTS[hoveredChannel] : DEFAULT_ORB_COLOR;
    case 'adding-slack':
    case 'paste-slack-token':
    case 'running-slack-quick-setup':
    case 'slack-oauth-ready':
    case 'waiting-slack':
      return CHANNEL_TINTS.slack;
    case 'adding-telegram':
    case 'telegram-intro':
    case 'pick-telegram-token-delivery':
    case 'telegram-link-token':
    case 'telegram-test':
      return CHANNEL_TINTS.telegram;
    case 'adding-email':
    case 'email-ready':
      return CHANNEL_TINTS.email;
    case 'dashboard-channel-ready':
      return CHANNEL_TINTS[phase.channel];
    case 'success': {
      const activeChannel = phase.connectedChannel ?? phase.dashboardRedirectChannel;

      return activeChannel ? CHANNEL_TINTS[activeChannel] : DEFAULT_ORB_COLOR;
    }
    case 'generating':
      return DEFAULT_ORB_COLOR;
    case 'preview-generated': {
      const morph = previewMorphProgress ?? 0;

      return lerpHexColor(DEFAULT_ORB_COLOR, PREVIEW_ORB_COLOR, morph);
    }
    default:
      return DEFAULT_ORB_COLOR;
  }
}

/**
 * Pick the channel label rendered inside the orb for the current phase.
 */
export function computeOrbLabel(
  phase: ReturnType<ConnectStore['phase']['get']>,
  hoveredChannel: ChannelChoice | null
): string | undefined {
  switch (phase.kind) {
    case 'pick-channel':
      return hoveredChannel ? CHANNEL_LABELS[hoveredChannel] : undefined;
    case 'adding-slack':
    case 'paste-slack-token':
    case 'running-slack-quick-setup':
    case 'slack-oauth-ready':
    case 'waiting-slack':
      return CHANNEL_LABELS.slack;
    case 'adding-telegram':
    case 'telegram-intro':
    case 'pick-telegram-token-delivery':
    case 'telegram-link-token':
    case 'telegram-test':
      return CHANNEL_LABELS.telegram;
    case 'adding-email':
    case 'email-ready':
      return CHANNEL_LABELS.email;
    case 'dashboard-channel-ready':
      return CHANNEL_LABELS[phase.channel];
    case 'success': {
      const activeChannel = phase.connectedChannel ?? phase.dashboardRedirectChannel;

      return activeChannel ? CHANNEL_LABELS[activeChannel] : undefined;
    }
    default:
      return undefined;
  }
}
