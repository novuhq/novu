<script setup lang="ts">
import { useNovuUI } from '../context/NovuUIProviderContext';
import Mounter from './Mounter.vue';  // Assuming Mounter is a Vue component

// Initialize the context
const novuUI = useNovuUI();

// Mounting the component when the element is ready
const mount = (element: HTMLElement) => novuUI.value.mountComponent({
  name: 'Preferences',
  element,
});
</script>

<template>
  <Mounter :mount="mount" />
</template>
