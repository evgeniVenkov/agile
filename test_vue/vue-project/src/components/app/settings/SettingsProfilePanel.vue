<template>
  <div class="panel settings-panel">
    <h2>Настройки профиля</h2>
    <div class="settings-form">
      <label>
        Новый пароль
        <div class="password-field">
          <input
            v-model="settingsForm.password"
            :type="showSettingsPassword ? 'text' : 'password'"
            placeholder="минимум 6 символов"
          />
          <button
            type="button"
            class="eye-btn"
            :aria-label="showSettingsPassword ? 'Скрыть пароль' : 'Показать пароль'"
            @click="emit('toggleSettingsPassword')"
          >
            {{ showSettingsPassword ? 'Hide' : 'Show' }}
          </button>
        </div>
        <span class="optional">Оставьте пустым, если не нужно менять пароль</span>
      </label>
      <label>
        Роль
        <select v-model="settingsForm.role">
          <option value="admin">Администратор</option>
          <option value="team-lead">Тим лид</option>
          <option value="backend-developer">Бэк разработчик</option>
          <option value="frontend-developer">Фронт разработчик</option>
          <option value="designer">Дизайнер</option>
        </select>
      </label>
      <button class="primary" type="button" @click="emit('saveSettings')">Сохранить</button>
      <p v-if="settingsError" class="error">{{ settingsError }}</p>
      <p v-if="settingsSuccess" class="info">{{ settingsSuccess }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  settingsForm: {
    type: Object,
    required: true,
  },
  showSettingsPassword: {
    type: Boolean,
    default: false,
  },
  settingsError: {
    type: String,
    default: '',
  },
  settingsSuccess: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['toggleSettingsPassword', 'saveSettings'])
</script>
