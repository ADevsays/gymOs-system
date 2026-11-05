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
      <div v-if="$slots.prefix || prefixText" class="absolute left-3.5 flex items-center pointer-events-none text-muted">
        <slot name="prefix">
          <span v-if="prefixText" class="text-xs font-medium">{{ prefixText }}</span>
        </slot>
      </div>

      <textarea
        v-if="type === 'textarea'"
        :id="computedId"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :rows="rows || 3"
        @input="handleInput"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        class="w-full bg-surface-2 border border-border text-text px-3.5 py-2.5 rounded-xl text-xs lg:text-sm outline-none focus:border-accent transition-colors resize-none duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="[
          inputClass,
          error ? 'border-danger focus:border-danger' : '',
          mono ? 'font-mono' : ''
        ]"
      ></textarea>

      <input
        v-else
        :id="computedId"
        :type="type"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :min="min"
        :max="max"
        :step="step ?? (type === 'number' ? 'any' : undefined)"
        :autocomplete="autocomplete"
        @input="handleInput"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
        class="w-full bg-surface-2 border border-border text-text px-3.5 py-2.5 rounded-xl text-xs lg:text-sm outline-none focus:border-accent transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="[
          inputClass,
          ($slots.prefix || prefixText) ? 'pl-9' : '',
          ($slots.suffix || suffixText) ? 'pr-9' : '',
          error ? 'border-danger focus:border-danger' : '',
          mono ? 'font-mono' : ''
        ]"
      />

      <div v-if="$slots.suffix || suffixText" class="absolute right-3.5 flex items-center pointer-events-none text-muted">
        <slot name="suffix">
          <span v-if="suffixText" class="text-xs font-medium">{{ suffixText }}</span>
        </slot>
      </div>
    </div>

    <p v-if="error" class="text-[11px] text-danger font-medium mt-0.5">{{ error }}</p>
    <p v-else-if="hint" class="text-[11px] text-muted mt-0.5">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(defineProps<{
  modelValue?: string | number | null;
  label?: string;
  type?: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  mono?: boolean;
  rows?: number;
  wrapperClass?: string;
  inputClass?: string;
  prefixText?: string;
  suffixText?: string;
  autocomplete?: string;
}>(), {
  type: 'text',
  required: false,
  disabled: false,
  mono: false,
  rows: 3,
  wrapperClass: '',
  inputClass: ''
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'focus', event: FocusEvent): void;
}>();

const autoId = useId();
const computedId = computed(() => props.id || autoId);

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  let value: any = target.value;
  if (props.type === 'number') {
    value = value === '' ? null : Number(value);
  }
  emit('update:modelValue', value);
};
</script>
