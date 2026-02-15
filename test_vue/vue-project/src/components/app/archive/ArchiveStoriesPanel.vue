<template>
  <div class="archive-list">
    <h3>Последние истории</h3>
    <p v-if="!archiveData.stories.length" class="empty">Архив пуст за этот период.</p>
    <article v-for="item in archiveData.stories" :key="item.id" class="story-card">
      <div class="story-header">
        <div>
          <p class="story-title">{{ item.title }}</p>
          <p class="story-owner">
            Автор: {{ item.ownerName ?? 'не указан' }} · Закрыто:
            {{ new Date(item.completedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) }}
          </p>
        </div>
        <div class="archive-actions">
          <span class="tag">{{ item.estimate }} SP</span>
          <button class="ghost-btn danger" type="button" @click="emit('removeArchivedStory', item.id)">
            Удалить
          </button>
        </div>
      </div>
      <ul class="tasks">
        <li v-for="task in item.tasks" :key="task.id ?? task.title">
          <label>
            <input :checked="task.done" disabled type="checkbox" />
            <span :class="{ done: task.done }">{{ task.title }}</span>
          </label>
        </li>
      </ul>
    </article>
  </div>
</template>

<script setup>
defineProps({
  archiveData: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['removeArchivedStory'])
</script>
