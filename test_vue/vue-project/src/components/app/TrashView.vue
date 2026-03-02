<template>
  <div class="workspace">
    <p v-if="boardError" class="error">{{ boardError }}</p>
    <p v-if="infoMessage" class="info">{{ infoMessage }}</p>

    <section class="panel">
      <div class="trash-bin-header">
        <h2>Корзина удалённых историй</h2>
        <span class="muted">Последние {{ deletedStories.length }} из 5</span>
      </div>

      <p v-if="!deletedStories.length" class="empty">
        Корзина пуста.
      </p>

      <ul v-else class="trash-bin-list">
        <li v-for="story in deletedStories" :key="story.binId" class="trash-bin-item">
          <div>
            <p class="trash-bin-title">{{ story.title }}</p>
            <p class="muted">Удалено: {{ new Date(story.deletedAt).toLocaleString('ru-RU') }}</p>
          </div>
          <button
            class="ghost-btn"
            type="button"
            @click="emit('restoreDeletedStory', story.binId)"
          >
            Восстановить
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
defineProps({
  deletedStories: {
    type: Array,
    default: () => [],
  },
  boardError: {
    type: String,
    default: '',
  },
  infoMessage: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['restoreDeletedStory'])
</script>
