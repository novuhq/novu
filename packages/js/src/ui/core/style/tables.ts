import { SeverityLevelEnum } from '../../../types';
import type { AllAppearanceKey } from '../../types';

/**
 * The appearance keys and base classes of every part of the notification item.
 *
 * The Solid item and the host-native `NotificationItem` blocks both read from here, so a class typed in one
 * renderer's JSX instead of this table is the drift ADR 0001 rules out.
 */
export const SEVERITY_TO_NOTIFICATION_KEYS: Record<SeverityLevelEnum, AllAppearanceKey> = {
  [SeverityLevelEnum.NONE]: 'notification',
  [SeverityLevelEnum.HIGH]: 'severityHigh__notification',
  [SeverityLevelEnum.MEDIUM]: 'severityMedium__notification',
  [SeverityLevelEnum.LOW]: 'severityLow__notification',
};

export const SEVERITY_TO_BAR_KEYS: Record<SeverityLevelEnum, AllAppearanceKey> = {
  [SeverityLevelEnum.NONE]: 'notificationBar',
  [SeverityLevelEnum.HIGH]: 'severityHigh__notificationBar',
  [SeverityLevelEnum.MEDIUM]: 'severityMedium__notificationBar',
  [SeverityLevelEnum.LOW]: 'severityLow__notificationBar',
};

export const notificationItemStyles = {
  root: {
    className:
      'nt-transition nt-w-full nt-text-sm hover:nt-bg-primary-alpha-25 nt-group nt-relative nt-flex nt-items-start nt-p-4 nt-gap-2 [&:not(:first-child)]:nt-border-t nt-border-neutral-alpha-100',
    clickable: 'nt-cursor-pointer',
    severity: {
      [SeverityLevelEnum.NONE]: '',
      [SeverityLevelEnum.HIGH]: 'nt-bg-severity-high-alpha-100 hover:nt-bg-severity-high-alpha-50',
      [SeverityLevelEnum.MEDIUM]: 'nt-bg-severity-medium-alpha-100 hover:nt-bg-severity-medium-alpha-50',
      [SeverityLevelEnum.LOW]: 'nt-bg-severity-low-alpha-100 hover:nt-bg-severity-low-alpha-50',
    },
  },
  bar: {
    className: 'nt-transition nt-absolute nt-left-0 nt-top-0 nt-bottom-0 nt-w-[3px]',
    severity: {
      [SeverityLevelEnum.NONE]: '',
      [SeverityLevelEnum.HIGH]: 'nt-bg-severity-high group-hover:nt-bg-severity-high-alpha-500',
      [SeverityLevelEnum.MEDIUM]: 'nt-bg-severity-medium group-hover:nt-bg-severity-medium-alpha-500',
      [SeverityLevelEnum.LOW]: 'nt-bg-severity-low group-hover:nt-bg-severity-low-alpha-500',
    },
  },
  avatarFallback: {
    key: 'notificationImageLoadingFallback',
    className: 'nt-size-8 nt-rounded-lg nt-shrink-0 nt-aspect-square',
  },
  avatar: {
    key: 'notificationImage',
    className: 'nt-size-8 nt-rounded-lg nt-object-cover nt-aspect-square',
  },
  content: {
    key: 'notificationContent',
    className: 'nt-flex nt-flex-col nt-gap-2 nt-w-full',
  },
  textContainer: {
    key: 'notificationTextContainer',
    className: '',
  },
  subject: {
    key: 'notificationSubject',
    strongKey: 'notificationSubject__strong',
    emKey: 'notificationSubject__em',
    className: 'nt-text-start nt-font-medium nt-whitespace-pre-wrap [word-break:break-word]',
  },
  body: {
    key: 'notificationBody',
    strongKey: 'notificationBody__strong',
    emKey: 'notificationBody__em',
    className: 'nt-text-start nt-whitespace-pre-wrap nt-text-foreground-alpha-600 [word-break:break-word]',
  },
  defaultActions: {
    key: 'notificationDefaultActions',
    className:
      'nt-absolute nt-transition nt-duration-100 nt-ease-out nt-gap-0.5 nt-flex nt-shrink-0 nt-opacity-0 group-hover:nt-opacity-100 group-focus-within:nt-opacity-100 nt-justify-center nt-items-center nt-bg-background/90 nt-right-3 nt-top-3 nt-border nt-border-neutral-alpha-100 nt-rounded-lg nt-backdrop-blur-lg nt-p-0.5',
  },
  customActions: {
    key: 'notificationCustomActions',
    className: 'nt-flex nt-flex-wrap nt-gap-2',
    primaryKey: 'notificationPrimaryAction__button',
    secondaryKey: 'notificationSecondaryAction__button',
  },
  date: {
    key: 'notificationDate',
    className: 'nt-text-foreground-alpha-400 nt-flex nt-items-center nt-gap-1',
  },
  deliveredAtBadge: {
    key: 'notificationDeliveredAt__badge',
  },
  deliveredAtIcon: {
    key: 'notificationDeliveredAt__icon',
    className: 'nt-size-3',
  },
  snoozedUntilIcon: {
    key: 'notificationSnoozedUntil__icon',
    className: 'nt-size-3',
  },
  dotContainer: {
    className: 'nt-w-1.5 nt-flex nt-justify-center nt-shrink-0',
  },
  dot: {
    key: 'notificationDot',
    className: 'nt-size-1.5 nt-bg-primary nt-rounded-full',
  },
} as const satisfies Record<string, Record<string, unknown>>;

/** The badge primitive, as used for the delivered-at time of an item. */
export const badgeStyles = {
  key: 'badge',
  base: 'nt-inline-flex nt-flex-row nt-gap-1 nt-items-center',
  variants: {
    secondary: 'nt-bg-neutral-alpha-50',
  },
  sizes: {
    default: 'nt-px-1 nt-py-px nt-rounded-sm nt-text-xs nt-px-1',
  },
} as const;

/** Inline markdown emphasis inside subjects and bodies. */
export const markdownStyles = {
  strong: { key: 'strong', className: 'nt-font-semibold' },
  em: { key: 'em', className: 'nt-italic' },
} as const;
