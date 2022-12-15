<script lang="ts">
import { css } from '@emotion/css';
import {
  getStyleByPath,
  getDefaultTheme,
  getDefaultBellColors,
  NotificationCenterContentWebComponent,
} from '@novu/notification-center';
import BellButton from './BellButton.vue';

customElements.define('notification-center-content-component', NotificationCenterContentWebComponent);

export default {
  components: {
    BellButton,
  },
  data() {
    const { popoverArrowClass, popoverDropdownClass, bellButtonClass, gradientDotClass, bellColors } =
      this.calculateStyles({ theme: this.theme, styles: this.styles, colorScheme: this.colorScheme });

    return {
      popoverArrowClass,
      popoverDropdownClass,
      bellButtonClass,
      gradientDotClass,
      bellColors,
      unseenCount: undefined as number | undefined,
      hasSlot: !!this.$slots.default,
    };
  },
  watch: {
    theme: {
      handler(val) {
        const { popoverArrowClass, popoverDropdownClass, bellButtonClass, gradientDotClass, bellColors } =
          this.calculateStyles({ theme: val, styles: this.styles, colorScheme: this.colorScheme });
        this.popoverArrowClass = popoverArrowClass;
        this.popoverDropdownClass = popoverDropdownClass;
        this.bellButtonClass = bellButtonClass;
        this.gradientDotClass = gradientDotClass;
        this.bellColors = bellColors;
      },
      deep: true,
    },
    styles: {
      handler(val) {
        const { popoverArrowClass, popoverDropdownClass, bellButtonClass, gradientDotClass, bellColors } =
          this.calculateStyles({ theme: this.theme, styles: val, colorScheme: this.colorScheme });
        this.popoverArrowClass = popoverArrowClass;
        this.popoverDropdownClass = popoverDropdownClass;
        this.bellButtonClass = bellButtonClass;
        this.gradientDotClass = gradientDotClass;
        this.bellColors = bellColors;
      },
      deep: true,
    },
    colorScheme: {
      handler(val) {
        const { popoverArrowClass, popoverDropdownClass, bellButtonClass, gradientDotClass, bellColors } =
          this.calculateStyles({ theme: this.theme, styles: this.styles, colorScheme: val });
        this.popoverArrowClass = popoverArrowClass;
        this.popoverDropdownClass = popoverDropdownClass;
        this.bellButtonClass = bellButtonClass;
        this.gradientDotClass = gradientDotClass;
        this.bellColors = bellColors;
      },
    },
  },
  mounted() {
    const arrowsContainer = (this.$refs.popover as any).$refs.popper.$_arrowNode as HTMLDivElement;
    arrowsContainer.childNodes.forEach((node) => {
      (node as HTMLDivElement).classList.add(this.popoverArrowClass);
    });

    // listen to the unseen count changed event propagated from the web component
    document.addEventListener('novu:unseen_count_changed', (event) => {
      this.unseenCount = (event as CustomEvent).detail as number;
    });
  },
  methods: {
    calculateStyles: ({
      styles,
      theme: propsTheme,
      colorScheme,
    }: Pick<NotificationCenterComponentProps, 'theme' | 'styles' | 'colorScheme'>) => {
      const { theme, common } = getDefaultTheme({ colorScheme, theme: propsTheme });
      const { bellColors } = getDefaultBellColors({
        colorScheme,
        bellColors: {},
      });

      return {
        popoverArrowClass: css(
          getStyleByPath({
            styles,
            path: 'popover.arrow',
            theme,
            common,
            colorScheme,
          })
        ),
        popoverDropdownClass: css(
          getStyleByPath({
            styles,
            path: 'popover.dropdown',
            theme,
            common,
            colorScheme,
          })
        ),
        bellButtonClass: css(
          getStyleByPath({
            styles,
            path: 'bellButton.root',
            theme,
            common,
            colorScheme,
          })
        ),
        gradientDotClass: css(
          getStyleByPath({
            styles,
            path: 'bellButton.dot',
            theme,
            common,
            colorScheme,
          })
        ),
        bellColors,
      };
    },
  },
};
</script>

<script setup lang="ts">
import type { NotificationCenterContentComponentProps } from '@novu/notification-center';

export type FloatingPlacement = 'end' | 'start';
export type FloatingSide = 'top' | 'right' | 'bottom' | 'left' | 'auto';
export type FloatingPosition = FloatingSide | `${FloatingSide}-${FloatingPlacement}`;
export interface NotificationCenterComponentProps {
  backendUrl?: NotificationCenterContentComponentProps['backendUrl'];
  socketUrl?: NotificationCenterContentComponentProps['socketUrl'];
  subscriberId?: NotificationCenterContentComponentProps['subscriberId'];
  applicationIdentifier: NotificationCenterContentComponentProps['applicationIdentifier'];
  subscriberHash?: NotificationCenterContentComponentProps['subscriberHash'];
  stores?: NotificationCenterContentComponentProps['stores'];
  tabs?: NotificationCenterContentComponentProps['tabs'];
  showUserPreferences?: NotificationCenterContentComponentProps['showUserPreferences'];
  popover?: {
    offset?: number;
    position?: FloatingPosition;
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
}

withDefaults(defineProps<NotificationCenterComponentProps>(), { colorScheme: 'dark' });
</script>

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

<template>
  <VDropdown
    :theme="colorScheme"
    :popperClass="popoverDropdownClass"
    :placement="popover?.position"
    :distance="popover?.offset"
    ref="popover"
  >
    <!-- Popover target - usually button -->
    <slot v-if="hasSlot" v-bind="unseenCount" :unseen-count="unseenCount" />
    <BellButton
      v-else
      :bellButtonClass="bellButtonClass"
      :gradientDotClass="gradientDotClass"
      :unseenCount="unseenCount"
      :colors="bellColors"
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
        :theme="theme"
        :styles="styles"
        :colorScheme="colorScheme"
        :i18n="i18n"
        :sessionLoaded="sessionLoaded"
        :notificationClicked="notificationClicked"
        :unseenCountChanged="unseenCountChanged"
        :actionClicked="actionClicked"
        :tabClicked="tabClicked"
      />
    </template>
  </VDropdown>
</template>
