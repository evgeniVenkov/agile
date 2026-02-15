<template>
  <div class="velocity">
    <h3>Динамика закрытия</h3>
    <div v-if="!archiveData.velocity.length" class="empty">Нет данных за выбранный период</div>
    <div v-else class="velocity-grid">
      <div v-for="bucket in archiveData.velocity" :key="bucket.date" class="velocity-card">
        <p class="label">{{ new Date(bucket.date).toLocaleDateString('ru-RU') }}</p>
        <p class="value">{{ bucket.stories }}</p>
        <p class="muted">{{ bucket.points }} SP</p>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  archiveData: {
    type: Object,
    required: true,
  },
})
</script>
