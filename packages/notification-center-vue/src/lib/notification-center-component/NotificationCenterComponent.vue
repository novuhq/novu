<script setup lang="ts">
import { ref, watch, useSlots, computed, onMounted } from 'vue';
import type { NotificationCenterContentComponentProps } from '@novu/notification-center';
import BellButton from './BellButton.vue';
import { calculateStyles } from './utils';

export type FloatingPlacement = 'end' | 'start';
export type FloatingSide = 'top' | 'right' | 'bottom' | 'left' | 'auto';
export type FloatingPosition = FloatingSide | `${FloatingSide}-${FloatingPlacement}`;

export interface INotificationCenterComponentProps {
  backendUrl?: NotificationCenterContentComponentProps['backendUrl'];
  socketUrl?: NotificationCenterContentComponentProps['socketUrl'];
  subscriberId?: NotificationCenterContentComponentProps['subscriberId'];
  applicationIdentifier: NotificationCenterContentComponentProps['applicationIdentifier'];
  subscriberHash?: NotificationCenterContentComponentProps['subscriberHash'];
  stores?: NotificationCenterContentComponentProps['stores'];
  tabs?: NotificationCenterContentComponentProps['tabs'];
  showUserPreferences?: NotificationCenterContentComponentProps['showUserPreferences'];
  allowedNotificationActions?: NotificationCenterContentComponentProps['allowedNotificationActions'];
  /**
   * @deprecated Use popoverConfig instead
   */
  popover?: {
    offset?: number;
    position?: FloatingPosition;
  };
  popoverConfig?: {
    offset?: number;
    position?: FloatingPosition;
    triggers: string[];
  };
  theme?: NotificationCenterContentComponentProps['theme'];
  styles?: NotificationCenterContentComponentProps['styles'];
  colorScheme?: NotificationCenterContentComponentProps['colorScheme'];
  i18n?: NotificationCenterContentComponentProps['i18n'];
  sessionLoaded?: NotificationCenterContentComponentProps['sessionLoaded'];
  notificationClicked?: NotificationCenterContentComponentProps['notificationClicked'];
  unseenCountChanged?: NotificationCenterContentComponentProps['unseenCountChanged'];
  actionClicked?: NotificationCenterContentComponentProps['actionClicked'];
  tabClicked?: NotificationCenterContentComponentProps['tabClicked'];
  preferenceFilter?: NotificationCenterContentComponentProps['preferenceFilter'];
}

const props = withDefaults(defineProps<INotificationCenterComponentProps>(), {
  colorScheme: 'dark',
  popoverConfig: () => ({ triggers: ['click', 'touch'] }),
});
const slots = useSlots();
const popper = ref();
const unseenCount = ref<number | undefined>(undefined);
const hasSlot = ref(!!slots.default);

const computedStyles = computed(() => {
  const { popoverArrowClass, popoverDropdownClass, bellButtonClass, gradientDotClass, bellColors } = calculateStyles({
    theme: props.theme,
    styles: props.styles,
    colorScheme: props.colorScheme,
  });

  return {
    popoverArrowClass,
    popoverDropdownClass,
    bellButtonClass,
    gradientDotClass,
    bellColors,
  };
});

const updateArrowStyles = (arrowClass: string) => {
  // add the popover arrow class to the arrow element, there is no better way to do this
  const arrowClasses = ['v-popper__arrow-outer', 'v-popper__arrow-inner'];
  const arrowsContainer = popper.value.$refs.popper.$_arrowNode as HTMLDivElement;
  arrowsContainer.childNodes.forEach((node, idx) => {
    (node as HTMLDivElement).className = '';
    (node as HTMLDivElement).classList.add(arrowClasses[idx], arrowClass);
  });
};

onMounted(() => {
  updateArrowStyles(computedStyles.value.popoverArrowClass);

  // listen to the unseen count changed event propagated from the web component
  document.addEventListener('novu:unseen_count_changed', (event) => {
    unseenCount.value = (event as CustomEvent).detail as number;
  });
});

watch(computedStyles, (newComputedStyles) => {
  updateArrowStyles(newComputedStyles.popoverArrowClass);
});
</script>

<template>
  <VDropdown
    :theme="colorScheme"
    :popperClass="computedStyles.popoverDropdownClass"
    :placement="popoverConfig?.position || popover?.position"
    :distance="popoverConfig?.offset || popover?.offset"
    :triggers="popoverConfig?.triggers"
    eager-mount
    ref="popper"
  >
    <!-- Popover target - usually button -->
    <slot v-if="hasSlot" v-bind="unseenCount" :unseen-count="unseenCount" />
    <BellButton
      v-else
      :bellButtonClass="computedStyles.bellButtonClass"
      :gradientDotClass="computedStyles.gradientDotClass"
      :unseenCount="unseenCount"
      :colors="computedStyles.bellColors"
    />
    <!-- Popover content -->
    <template #popper>
      <notification-center-content-component
        :backendUrl="backendUrl"
        :socketUrl="socketUrl"
        :subscriberId="subscriberId"
        :applicationIdentifier="applicationIdentifier"
        :subscriberHash="subscriberHash"
        :stores="stores"
        :tabs="tabs"
        :showUserPreferences="showUserPreferences"
        :allowedNotificationActions="allowedNotificationActions"
        :theme="theme"
        :styles="styles"
        :colorScheme="colorScheme"
        :i18n="i18n"
        :sessionLoaded="sessionLoaded"
        :notificationClicked="notificationClicked"
        :unseenCountChanged="unseenCountChanged"
        :actionClicked="actionClicked"
        :tabClicked="tabClicked"
        :preferenceFilter="preferenceFilter"
      />
    </template>
  </VDropdown>
</template>

<style>
.v-popper--theme-light .v-popper__inner,
.v-popper--theme-dark .v-popper__inner {
  background: transparent;
  border: none;
  box-shadow: none;
}
.v-popper--theme-light .v-popper__arrow-outer,
.v-popper--theme-light .v-popper__arrow-inner {
  border-color: #fff;
}
.v-popper--theme-dark .v-popper__arrow-outer,
.v-popper--theme-dark .v-popper__arrow-inner {
  border-color: #1e1e26;
}
</style>