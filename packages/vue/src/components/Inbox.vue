<script setup lang="ts">
import DefaultInbox from './DefaultInbox.vue';
import { BaseNovuProviderProps, InboxProps } from '@novu/js/ui';
import { NovuOptions } from '@novu/js';
import NovuProvider from './NovuProvider.vue';
import { useUnsafeNovu } from '../context/NovuProviderContext';
import NovuUIProvider from './NovuUIProvider.vue';

const props = defineProps<Omit<NovuOptions & Omit<BaseNovuProviderProps, 'options'> & InboxProps, 'rendererBell' | 'rendererNotification'>>();

const novu = useUnsafeNovu();
</script>

<template>
  <NovuProvider v-if="!novu" :application-identifier="props.applicationIdentifier" :subscriber-id="props.subscriberId"
    :subscriber-hash="props.subscriberHash" :backend-url="props.backendUrl" :socket-url="props.socketUrl"
    user-agent-type="components">
    <NovuUIProvider :appearance="props.appearance" :localization="props.localization" :options="props"
      :tabs="props.tabs" :preferences-filter="props.preferencesFilter" :router-push="props.routerPush">
      <DefaultInbox v-bind="{ ...$props, ...$slots }" />
    </NovuUIProvider>
  </NovuProvider>

  <NovuUIProvider v-else :appearance="props.appearance" :localization="props.localization" :options="props"
    :tabs="props.tabs" :preferences-filter="props.preferencesFilter" :router-push="props.routerPush">
    <DefaultInbox v-bind="{ ...$props, ...$slots }" />
  </NovuUIProvider>
</template>
