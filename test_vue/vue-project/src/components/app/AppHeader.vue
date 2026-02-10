<template>
  <header class="hero">
    <div>
      <p class="eyebrow">Agile Workspace</p>
      <h1>Мини-приложение для планирования спринтов</h1>
      <p class="lede">
        Регистрируйтесь, оценивайте пользовательские истории, ведите задачи и отслеживайте
        прогресс с одного экрана.
      </p>
    </div>
    <div v-if="currentUser" class="user-chip">
      <div class="user-chip-info">
        <span class="user-chip-name">{{ currentUser.username }}</span>
        <span class="user-chip-role">{{ userRoleLabel }}</span>
      </div>
      <button class="ghost" type="button" @click="emit('logout')">Выйти</button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  currentUser: {
    type: Object,
    default: null,
  },
  userRoleLabel: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['logout'])
</script>
