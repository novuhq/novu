<script lang="ts">
export default {
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
    v-slot="slot"
  >
    <button>Notifications: {{ slot.unseenCount }}</button>
  </NotificationCenterComponent>
</template>

<style scoped></style>
