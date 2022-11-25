<script lang="ts">
import { NotificationCenterComponent } from '@novu/notification-center-vue';

export default {
  components: {
    NotificationCenterComponent,
  },
  data() {
    return {
      applicationIdentifier: import.meta.env.VITE_NOVU_APP_IDENTIFIER,
      subscriberId: import.meta.env.VITE_NOVU_SUBSCRIBER_ID,
    };
  },
};
</script>

<template>
  <NotificationCenterComponent :subscriberId="subscriberId" :applicationIdentifier="applicationIdentifier" />
</template>

<style scoped></style>
