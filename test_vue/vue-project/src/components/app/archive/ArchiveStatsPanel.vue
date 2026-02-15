<template>
  <div class="stats archive-stats">
    <div>
      <p class="eyebrow">Архивировано историй</p>
      <strong>{{ archiveData.summary?.totalStories ?? 0 }}</strong>
    </div>
    <div>
      <p class="eyebrow">Story Points</p>
      <strong>{{ archiveData.summary?.totalPoints ?? 0 }}</strong>
    </div>
    <div>
      <p class="eyebrow">Задачи</p>
      <strong>{{ archiveData.summary?.doneTasks ?? 0 }} / {{ archiveData.summary?.totalTasks ?? 0 }}</strong>
    </div>
    <div>
      <p class="eyebrow">Активных владельцев</p>
      <strong>{{ archiveData.summary?.ownerCount ?? 0 }}</strong>
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
