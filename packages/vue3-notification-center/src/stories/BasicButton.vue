<template>
  <button type="button" :class="classes" @click="onClick" :style="style">
    {{ label }}
  </button>
</template>

<script setup lang="ts">
import { Size } from "@/types/Size";
import { computed } from "vue";

interface Props {
  label: string;
  primary?: boolean;
  backgroundColor?: string;
  size: Size;
}

interface Emits {
  (e: "click"): void;
}

const props = withDefaults(defineProps<Props>(), { primary: false });

const emit = defineEmits<Emits>();

const onClick = () => {
  emit("click");
};

const classes = computed(() => ({
  "storybook-button": true,
  "storybook-button--primary": props.primary,
  "storybook-button--secondary": !props.primary,
  [`storybook-button--${props.size || "medium"}`]: true,
}));

const style = computed(() => ({
  backgroundColor: props.backgroundColor,
}));
</script>

<style lang="scss" scoped>
@use "@/styles/functions/color" as *;

.storybook-button {
  font-family: "Overpass", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-weight: 700;
  border: 0;
  border-radius: 3em;
  cursor: pointer;
  display: inline-block;
  line-height: 1;
}
.storybook-button--primary {
  color: color(light);
  background-color: color(cta, primary);
  border-color: color(cta, primary);

  @media (prefers-color-scheme: dark) {
    color: color(dark);
    background-color: color(light);
  }
}
.storybook-button--secondary {
  color: color(light);
  background-color: transparent;
  box-shadow: color(light) 0px 0px 0px 1px inset;

  @media (prefers-color-scheme: dark) {
    background-color: color(dark);
    color: color(light);
  }
}
.storybook-button--small {
  font-size: 12px;
  padding: 10px 16px;
}
.storybook-button--medium {
  font-size: 14px;
  padding: 11px 20px;
}
.storybook-button--large {
  font-size: 16px;
  padding: 12px 24px;
}
</style>
