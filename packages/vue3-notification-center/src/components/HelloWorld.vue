<script setup lang="ts">
import BasicButton from "@/stories/BasicButton.vue";
import { ref } from "vue";

defineProps<{ msg: string }>();

const count = ref(0);
</script>

<template>
  <h1>{{ msg }}</h1>

  <basic-button
    size="small"
    type="button"
    @click="count++"
    :label="`Clicked ${count} times`"
  >
  </basic-button>
</template>

<style lang="scss" scoped>
@use "@/styles/functions/color" as *;

label {
  margin: 0 0.5em;
  font-weight: bold;
}

code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  color: #304455;
}
</style>
