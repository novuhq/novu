<script setup lang="ts">
import { ref, computed } from 'vue';
import { colors as themeColors } from '@novu/notification-center';

export interface ISvgStopColor {
  stopColor?: string;
  stopColorOffset?: string;
}
export interface INotificationBellColors {
  unseenBadgeColor?: string | ISvgStopColor;
  unseenBadgeBackgroundColor?: string;
}

const props = defineProps<{
  unseenCount?: number;
  bellButtonClass?: string;
  gradientDotClass?: string;
  colors: INotificationBellColors;
}>();

const { colors } = props;
const color = ref(colors.unseenBadgeColor);
const isRegularColor = computed(() => typeof color.value === 'string');
const gradientDot = computed(() => ({
  stopColor: isRegularColor.value ? (color.value as string) : (color.value as ISvgStopColor).stopColor,
  offsetStopColor: isRegularColor.value ? (color.value as string) : (color.value as ISvgStopColor).stopColorOffset,
}));
</script>

<template>
  <button :class="['nc-bell-button', bellButtonClass]">
    <svg
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      :color="themeColors.B60"
    >
      <path
        d="M21.6667 10.8C21.6667 8.99653 20.9643 7.26692 19.714 5.99167C18.4638 4.71643 16.7681 4 15 4C13.2319 4 11.5362 4.71643 10.286 5.99167C9.03571 7.26692 8.33333 8.99653 8.33333 10.8C8.33333 18.7333 5 21 5 21H25C25 21 21.6667 18.7333 21.6667 10.8Z"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>
      <path
        d="M17.7295 24C17.4521 24.6072 17.0539 25.1113 16.5748 25.4617C16.0956 25.812 15.5524 25.9965 14.9995 25.9965C14.4466 25.9965 13.9034 25.812 13.4243 25.4617C12.9452 25.1113 12.547 24.6072 12.2695 24"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></path>
    </svg>
    <svg
      v-if="unseenCount && unseenCount > 0"
      :class="['nc-bell-button-dot', gradientDotClass]"
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
    >
      <rect
        x="1.5"
        y="1.5"
        width="13"
        height="13"
        rx="6.5"
        fill="url(#paint0_linear_1722_2699)"
        :stroke="colors.unseenBadgeBackgroundColor"
        stroke-width="3"
      ></rect>
      <defs>
        <linearGradient id="paint0_linear_1722_2699" x1="8" y1="13" x2="8" y2="3" gradientUnits="userSpaceOnUse">
          <stop :stop-color="gradientDot.stopColor"></stop>
          <stop offset="1" :stop-color="gradientDot.offsetStopColor"></stop>
        </linearGradient>
      </defs>
    </svg>
  </button>
</template>

<style>
.nc-bell-button {
  border: none;
  background-color: transparent;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  appearance: none;
  box-sizing: border-box;
  height: 28px;
  min-height: 28px;
  width: 28px;
  min-width: 28px;
  border-radius: 4px;
  padding: 0px;
  line-height: 1;
  display: flex;
  -webkit-box-align: center;
  align-items: center;
  -webkit-box-pack: center;
  justify-content: center;
  cursor: pointer;
}
.nc-bell-button:not(:disabled):active {
  transform: translateY(1px);
}
.nc-bell-button > .nc-bell-button-dot {
  position: absolute;
  top: -3%;
  right: 10%;
  width: 12px;
  height: 12px;
}
</style>
