<script setup lang="ts">
import { ref, onBeforeUnmount, watch, provide } from 'vue';
import { BaseNovuProviderProps, NovuUI } from '@novu/js/ui';
import { NovuUIContextSymbol } from '../context/NovuUIProviderContext';

// Define props with types
const props = defineProps<BaseNovuProviderProps>();

// Ref to hold the NovuUI instance
const novuUI = ref<NovuUI>(new NovuUI(props));

// Watch for changes in options and update the novuUI instance accordingly
watch(
  () => props,
  () => {
    if (novuUI.value) {
      novuUI.value.updateAppearance(props.appearance);
      novuUI.value.updateLocalization(props.localization);
      novuUI.value.updateTabs(props.tabs);
      novuUI.value.updateOptions(props.options);
      novuUI.value.updateRouterPush(props.routerPush);
    }
  });

// Cleanup on unmount
onBeforeUnmount(() => {
  if (novuUI.value) {
    novuUI.value.unmount();
  }
});

// Provide the novuUI instance to child components
provide(NovuUIContextSymbol, novuUI);
</script>

<template>
  <slot />
</template>
