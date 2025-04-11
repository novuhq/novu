import { ref, isRef, Ref, MaybeRef } from 'vue';

export function toRefSafe<T>(value: MaybeRef<T>, defaultValue?: T): Ref<T> {
  const data = (isRef(value) ? value : ref(value)) as Ref<T>;
  if (data.value === undefined && defaultValue) data.value = defaultValue;

  return data;
}
