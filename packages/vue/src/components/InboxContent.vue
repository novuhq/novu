<script setup lang="ts">
import { useSlots, h } from "vue";
import Mounter from './Mounter.vue';  // Assuming Mounter is a Vue component
import { InboxPage, NotificationRenderer } from '@novu/js/ui';
import { useNovuUI } from '../context/NovuUIProviderContext';

interface Slots {
  notification?: (props: { notification: Parameters<NotificationRenderer>[1] }) => any;
}

interface Props {
  onNotificationClick?: (notification: any) => void;
  onPrimaryActionClick?: () => void;
  onSecondaryActionClick?: () => void;
  initialPage?: InboxPage;
  hideNav?: boolean;
}

const props = defineProps<Props>();
const slots = useSlots() as unknown as Slots; // Get access to the slot content

const novuUI = useNovuUI();

const mount = (element: HTMLElement, mountElement: (el: HTMLElement, mountedElement: any) => void) => novuUI.value.mountComponent({
  name: 'InboxContent',
  element,
  props: {
    renderNotification: (slots.notification ? (el: Parameters<NotificationRenderer>[0], notification: Parameters<NotificationRenderer>[1]) => {
      const slotContent = slots.notification?.({ notification });

      if (slotContent) {
        const vnode = slotContent.length > 1 ? h("div", {}, slotContent) : slotContent[0];
        mountElement(el, vnode);
      }
    } : undefined) as NotificationRenderer | undefined,
    onNotificationClick: props.onNotificationClick,
    onPrimaryActionClick: props.onPrimaryActionClick,
    onSecondaryActionClick: props.onSecondaryActionClick,
    initialPage: props.initialPage,
    hideNav: props.hideNav
  },
});
</script>

<template>
  <Mounter :mount="mount" />
</template>
