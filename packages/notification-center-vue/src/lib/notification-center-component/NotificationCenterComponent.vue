<script lang="ts">
import { NotificationCenterWebComponent } from '@novu/notification-center';

customElements.define('notification-center-component', NotificationCenterWebComponent);
</script>

<script setup lang="ts">
import { NotificationCenterComponentProps } from '@novu/notification-center';

defineProps<{
  backendUrl?: NotificationCenterComponentProps['backendUrl'];
  socketUrl?: NotificationCenterComponentProps['socketUrl'];
  subscriberId?: NotificationCenterComponentProps['subscriberId'];
  applicationIdentifier: NotificationCenterComponentProps['applicationIdentifier'];
  subscriberHash?: NotificationCenterComponentProps['subscriberHash'];
  stores?: NotificationCenterComponentProps['stores'];
  tabs?: NotificationCenterComponentProps['tabs'];
  showUserPreferences?: NotificationCenterComponentProps['showUserPreferences'];
  popover?: NotificationCenterComponentProps['popover'];
  theme?: NotificationCenterComponentProps['theme'];
  styles?: NotificationCenterComponentProps['styles'];
  colorScheme?: NotificationCenterComponentProps['colorScheme'];
  i18n?: NotificationCenterComponentProps['i18n'];
  sessionLoaded?: NotificationCenterComponentProps['sessionLoaded'];
  notificationClicked?: NotificationCenterComponentProps['notificationClicked'];
  unseenCountChanged?: NotificationCenterComponentProps['unseenCountChanged'];
  actionClicked?: NotificationCenterComponentProps['actionClicked'];
  tabClicked?: NotificationCenterComponentProps['tabClicked'];
}>();
</script>

<template>
  <notification-center-component
    :backendUrl="backendUrl"
    :socketUrl="socketUrl"
    :subscriberId="subscriberId"
    :applicationIdentifier="applicationIdentifier"
    :subscriberHash="subscriberHash"
    :stores="stores"
    :tabs="tabs"
    :showUserPreferences="showUserPreferences"
    :popover="popover"
    :theme="theme"
    :styles="styles"
    :colorScheme="colorScheme"
    :i18n="i18n"
    :sessionLoaded="sessionLoaded"
    :notificationClicked="notificationClicked"
    :unseenCountChanged="unseenCountChanged"
    :actionClicked="actionClicked"
    :tabClicked="tabClicked"
  />
</template>
