<template>
  <div class="settings-view">
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
              {{ showSettingsPassword ? '🙈' : '👁️' }}
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

    <div v-if="userRole === 'admin' && currentProject" class="panel settings-panel">
      <h2>Участники проекта</h2>
      <p v-if="!currentProject" class="muted">Выберите проект для управления участниками</p>
      <div v-else>
        <div class="member-form">
          <label>
            Добавить участника по логину
            <div class="member-input-group">
              <input
                v-model="memberForm.username"
                placeholder="Введите логин пользователя"
                @keyup.enter.prevent="emit('addMember')"
              />
              <button class="primary small" type="button" @click="emit('addMember')">
                Добавить
              </button>
            </div>
          </label>
          <p v-if="memberError" class="error">{{ memberError }}</p>
          <p v-if="memberSuccess" class="info">{{ memberSuccess }}</p>
        </div>

        <div class="members-list">
          <h3>Список участников</h3>
          <p v-if="isMembersLoading" class="muted">Загрузка...</p>
          <p v-else-if="!projectMembers.length" class="muted">Нет участников в проекте</p>
          <div v-else class="members-grid">
            <div v-for="member in projectMembers" :key="member.id" class="member-card">
              <div class="member-info">
                <div class="member-header">
                  <span class="member-username">{{ member.username }}</span>
                  <span class="member-role-badge" :class="`role-${member.role}`">
                    {{ getRoleLabel(member.role) }}
                  </span>
                </div>
                <p class="member-meta">
                  Добавлен: {{ new Date(member.addedAt).toLocaleDateString('ru-RU') }}
                  <span v-if="member.addedByUsername"> · {{ member.addedByUsername }}</span>
                </p>
              </div>
              <button
                v-if="currentUser && member.userId !== currentUser.id"
                class="ghost-btn danger small"
                type="button"
                @click="emit('removeMember', member.userId)"
                title="Удалить из проекта"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
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
  userRole: {
    type: String,
    default: 'frontend-developer',
  },
  currentProject: {
    type: [String, Number],
    default: null,
  },
  memberForm: {
    type: Object,
    required: true,
  },
  memberError: {
    type: String,
    default: '',
  },
  memberSuccess: {
    type: String,
    default: '',
  },
  isMembersLoading: {
    type: Boolean,
    default: false,
  },
  projectMembers: {
    type: Array,
    default: () => [],
  },
  currentUser: {
    type: Object,
    default: null,
  },
  getRoleLabel: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits(['toggleSettingsPassword', 'saveSettings', 'addMember', 'removeMember'])
</script>
