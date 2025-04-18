<script setup lang="ts">
import { ref, onBeforeUnmount, watch, provide } from 'vue';
import { BaseNovuProviderProps, NovuUI } from '@novu/js/ui';
import { NovuUIKey } from '../context/NovuUIProviderContext';

// Define props with types
const props = defineProps<BaseNovuProviderProps>();

// the NovuUI instance
const novuUI = new NovuUI(props);

// Watch for changes in options and update the novuUI instance accordingly
watch(
  () => props,
  () => {
    if (novuUI) {
      novuUI.updateAppearance(props.appearance);
      novuUI.updateLocalization(props.localization);
      novuUI.updateTabs(props.tabs);
      novuUI.updateOptions(props.options);
      novuUI.updateRouterPush(props.routerPush);
    }
  });

// Cleanup on unmount
onBeforeUnmount(() => {
  if (novuUI) {
    novuUI.unmount();
  }
});

// Provide the novuUI instance to child components
provide(NovuUIKey, novuUI);
</script>

<template>
  <slot />
</template>
