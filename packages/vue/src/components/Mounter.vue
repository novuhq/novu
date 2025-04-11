<template>
  <div ref="mounterRef">
    <template v-for="(mountedElement, element) in mountedElements">
      <teleport :to="element.toString()">
        <component :is="mountedElement" />
      </teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, reactive } from 'vue';

interface Props {
  mount: (element: HTMLElement, mountElement: (el: HTMLElement, mountedElement: MountedElement) => void) => (() => void) | void;
}

const props = defineProps<Props>();

// Define types
type MountedElement = any;
type MountedElements = Map<HTMLElement, MountedElement>;

// Shared reactive state
const mountedElements = reactive<MountedElements>(new Map());

const mountElement = (el: HTMLElement, mountedElement: MountedElement) => {
  mountedElements.set(el, mountedElement);

  return () => {
    mountedElements.delete(el);
  };
};

const mounterRef = ref<HTMLElement | null>(null);
let unmount: (() => void) | void = undefined;

onMounted(() => {
  if (mounterRef.value) {
    unmount = props.mount(mounterRef.value, mountElement);
  }
});

onBeforeUnmount(() => {
  if (unmount) {
    unmount();
  }
});
</script>
