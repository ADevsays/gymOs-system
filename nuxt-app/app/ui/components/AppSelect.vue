<template>
  <div class="flex flex-col gap-1 w-full" :class="wrapperClass">
    <div v-if="label || $slots.label" class="flex items-center justify-between">
      <label :for="computedId" class="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1">
        <slot name="label">{{ label }}</slot>
        <span v-if="required" class="text-accent font-bold leading-none" title="Campo obligatorio">*</span>
      </label>
      <slot name="label-right" />
    </div>

    <div class="relative flex items-center w-full">
      <select
        :id="computedId"
        :value="modelValue"
        :required="required"
        :disabled="disabled"
        @change="handleChange"
        class="w-full bg-surface-2 border border-border text-text px-3.5 py-2.5 rounded-xl text-xs lg:text-sm outline-none focus:border-accent transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-9"
        :class="[
          selectClass,
          error ? 'border-danger focus:border-danger' : ''
        ]"
      >
        <slot>
          <option v-for="opt in options" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </slot>
      </select>
      <div class="absolute right-3.5 pointer-events-none text-muted">
        <ChevronDown class="w-4 h-4" />
      </div>
    </div>

    <p v-if="error" class="text-[11px] text-danger font-medium mt-0.5">{{ error }}</p>
    <p v-else-if="hint" class="text-[11px] text-muted mt-0.5">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

const props = withDefaults(defineProps<{
  modelValue?: string | number | null;
  label?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  options?: Array<{ value: string | number; label: string }>;
  wrapperClass?: string;
  selectClass?: string;
}>(), {
  required: false,
  disabled: false,
  wrapperClass: '',
  selectClass: ''
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void;
}>();

const autoId = useId();
const computedId = computed(() => props.id || autoId);

const handleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
};
</script>
