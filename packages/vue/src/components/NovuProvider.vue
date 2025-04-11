<script setup lang="ts">
import { provide, computed } from 'vue';
import { Novu } from '@novu/js';
import { NovuKey, NovuProviderProps } from '../context/NovuProviderContext';

// @ts-ignore
const version = PACKAGE_VERSION;
// @ts-ignore
const name = PACKAGE_NAME;
const baseUserAgent = `${name}@${version}`;

// Define props with types
const props = defineProps<NovuProviderProps>();

const novu = computed(
  () =>
    new Novu({
      ...props,
      __userAgent: `${baseUserAgent} ${props?.userAgentType}`,
    })
);

// Provide the novu instance to child components
provide(NovuKey, novu);
</script>

<template>
  <slot />
</template>
