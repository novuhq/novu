/*
 * The double underscore signals that entire key extends the right part of the key
 * i.e. foo__bar means that foo_bar is an extension of bar. Both keys will be applied when foo_bar is used
 * meaning you would have `bar foo__bar` in the dom
 */
export const appearanceKeys = [
  // Primitives
  'button',

  'popoverContent',
  'popoverTrigger',

  'dropdownContent',
  'dropdownTrigger',
  'dropdownItem',
  'dropdownItemLabel',
  'dropdownItemLabelContainer',
  'dropdownItemLeftIcon',
  'dropdownItemRightIcon',

  'tooltipContent',
  'tooltipTrigger',

  'back__button',

  'skeletonText',
  'skeletonAvatar',
  'tabsRoot',
  'tabsList',
  'tabsContent',
  'tabsTrigger',
  'dots',

  // General
  'root',
  'bellIcon',
  'bellContainer',
  'bellDot',
  'preferences__button',
  'preferencesContainer',
  'inboxHeader',
  'loading',

  // Inbox
  'inboxContent',
  'inbox__popoverTrigger',
  'inbox__popoverContent',

  // Notifications
  'notificationListContainer',
  'notificationList',
  'notificationListEmptyNoticeContainer',
  'notificationListEmptyNotice',
  'notificationListEmptyNoticeIcon',
  'notificationListNewNotificationsNotice__button',

  'notification',
  'notificationDot',
  'notificationSubject',
  'notificationSubject__strong',
  'notificationBody',
  'notificationBody__strong',
  'notificationBodyContainer',
  'notificationImage',
  'notificationDate',
  'notificationDefaultActions',
  'notificationCustomActions',
  'notificationPrimaryAction__button',
  'notificationSecondaryAction__button',
  'notificationRead__button',
  'notificationUnread__button',
  'notificationArchive__button',
  'notificationUnarchive__button',

  // Notifications tabs
  'notificationsTabs__tabsRoot',
  'notificationsTabs__tabsList',
  'notificationsTabs__tabsContent',
  'notificationsTabs__tabsTrigger',
  'notificationsTabsTriggerLabel',
  'notificationsTabsTriggerCount',

  // Inbox status
  'inboxStatus__title',
  'inboxStatus__dropdownTrigger',
  'inboxStatus__dropdownContent',
  'inboxStatus__dropdownItem',
  'inboxStatus__dropdownItemLabel',
  'inboxStatus__dropdownItemLabelContainer',
  'inboxStatus__dropdownItemLeft__icon',
  'inboxStatus__dropdownItemRight__icon',

  // More actions
  'moreActionsContainer',
  'moreActions__dropdownTrigger',
  'moreActions__dropdownContent',
  'moreActions__dropdownItem',
  'moreActions__dropdownItemLabel',
  'moreActions__dropdownItemLeft__icon',
  'moreActions__dots',

  // More tabs
  'moreTabs__button',
  'moreTabs__dots',
  'moreTabs__dropdownTrigger',
  'moreTabs__dropdownContent',
  'moreTabs__dropdownItem',
  'moreTabs__dropdownItemLabel',
  'moreTabs__dropdownItemRight__icon',

  // workflow
  'workflowContainer',
  'workflowLabel',
  'workflowLabelContainer',
  'workflowContainerDisabledNotice',
  'workflowLabelDisabled__icon',
  'workflowContainerRight__icon',
  'workflowArrow__icon',

  // channel
  'channelContainer',
  'channelsContainerCollapsible',
  'channelsContainer',
  'channelLabel',
  'channelLabelContainer',
  'channelDescription',
  'channelName',
  'channelSwitchContainer',
  'channelSwitch',
  'channelSwitchThumb',

  // Preferences Header
  'preferencesHeader',
  'preferencesHeader__back__button',
  'preferencesHeader__title',

  // Preferences Loading
  'preferencesLoadingContainer',

  // Text formatting
  'strong',
] as const;
