<script lang="ts">
import { NotificationCenterComponent } from '@novu/notification-center-vue';

export default {
  components: {
    NotificationCenterComponent,
  },
};
</script>

<template>
  <NotificationCenterComponent
    backendUrl="http://localhost:3000"
    socketUrl="http://localhost:3002"
    subscriberId="636b882596b705b341e5978a"
    applicationIdentifier="jDGZ6J573CSD"
  />
</template>

<style scoped></style>
