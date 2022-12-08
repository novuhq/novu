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
  methods: {
    sessionLoaded() {
      console.log('Vue app loaded!');
    },
  },
};
</script>

<template>
  <NotificationCenterComponent
    :subscriberId="subscriberId"
    :applicationIdentifier="applicationIdentifier"
    :sessionLoaded="sessionLoaded"
  />
</template>

<style scoped></style>
