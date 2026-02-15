<template>
  <div v-if="userRole === 'admin' && currentProject" class="panel settings-panel">
    <h2>Настройка Итераций</h2>
    <div class="settings-form">
      <label>
        Длинна Итерации (дни)
        <input v-model.number="projectSettingsForm.iterationDays" type="number" min="1" max="365" step="1" />
      </label>
      <button class="primary" type="button" @click="emit('saveProjectIterationSettings')">Сохранить</button>
      <p v-if="projectSettingsError" class="error">{{ projectSettingsError }}</p>
      <p v-if="projectSettingsSuccess" class="info">{{ projectSettingsSuccess }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  userRole: {
    type: String,
    default: 'frontend-developer',
  },
  currentProject: {
    type: [String, Number],
    default: null,
  },
  projectSettingsForm: {
    type: Object,
    required: true,
  },
  projectSettingsError: {
    type: String,
    default: '',
  },
  projectSettingsSuccess: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['saveProjectIterationSettings'])
</script>
