<template>
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
            <button class="primary small" type="button" @click="emit('addMember')">Добавить</button>
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

const emit = defineEmits(['addMember', 'removeMember'])
</script>
