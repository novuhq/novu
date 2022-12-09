<script lang="ts">
import { NotificationCenterWebComponent } from '@novu/notification-center';

customElements.define('notification-center-component', NotificationCenterWebComponent);
</script>

<script setup lang="ts">
import { NotificationCenterComponentProps } from '@novu/notification-center';

defineProps<{
  // NovuProvider props
  sessionLoaded?: NotificationCenterComponentProps['sessionLoaded'];
  stores?: NotificationCenterComponentProps['stores'];
  backendUrl?: NotificationCenterComponentProps['backendUrl'];
  socketUrl?: NotificationCenterComponentProps['socketUrl'];
  subscriberId?: NotificationCenterComponentProps['subscriberId'];
  applicationIdentifier: NotificationCenterComponentProps['applicationIdentifier'];
  subscriberHash?: NotificationCenterComponentProps['subscriberHash'];
  i18n?: NotificationCenterComponentProps['i18n'];
  // PopoverNotificationCenter props
  urlChanged?: NotificationCenterComponentProps['urlChanged'];
  notificationClicked?: NotificationCenterComponentProps['notificationClicked'];
  unseenCountChanged?: NotificationCenterComponentProps['unseenCountChanged'];
  actionClicked?: NotificationCenterComponentProps['actionClicked'];
  tabClicked?: NotificationCenterComponentProps['tabClicked'];
  colorScheme?: NotificationCenterComponentProps['colorScheme'];
  theme?: NotificationCenterComponentProps['theme'];
  tabs?: NotificationCenterComponentProps['tabs'];
  showUserPreferences?: NotificationCenterComponentProps['showUserPreferences'];
  offset?: NotificationCenterComponentProps['offset'];
  position?: NotificationCenterComponentProps['position'];
  // NotificationBell props
  unseenBadgeColor?: NotificationCenterComponentProps['unseenBadgeColor'];
  unseenBadgeBackgroundColor?: NotificationCenterComponentProps['unseenBadgeBackgroundColor'];
}>();
</script>

<template>
  <notification-center-component
    :sessionLoaded="sessionLoaded"
    :stores="stores"
    :backendUrl="backendUrl"
    :socketUrl="socketUrl"
    :subscriberId="subscriberId"
    :applicationIdentifier="applicationIdentifier"
    :subscriberHash="subscriberHash"
    :i18n="i18n"
    :urlChanged="urlChanged"
    :notificationClicked="notificationClicked"
    :unseenCountChanged="unseenCountChanged"
    :actionClicked="actionClicked"
    :tabClicked="tabClicked"
    :colorScheme="colorScheme"
    :theme="theme"
    :tabs="tabs"
    :showUserPreferences="showUserPreferences"
    :offset="offset"
    :position="position"
    :unseenBadgeColor="unseenBadgeColor"
    :unseenBadgeBackgroundColor="unseenBadgeBackgroundColor"
  />
</template>
