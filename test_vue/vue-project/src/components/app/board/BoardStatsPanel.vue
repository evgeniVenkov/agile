<template>
  <div class="stats">
    <div>
      <p class="eyebrow">Истории</p>
      <strong>{{ analytics.storiesCount }}</strong>
    </div>
    <div>
      <p class="eyebrow">Story Points</p>
      <strong>{{ analytics.storyPoints }}</strong>
    </div>
    <div>
      <p class="eyebrow">Задачи</p>
      <strong>{{ analytics.tasksDone }} / {{ analytics.tasksTotal }}</strong>
    </div>
    <div v-if="currentIterationInfo" class="panel">
      <p class="eyebrow">Текущая Итерация</p>
      <strong class="iteration-number">#{{ currentIterationInfo.number }}</strong>
      <p class="muted">
        {{ new Date(currentIterationInfo.startDate).toLocaleDateString('ru-RU') }} -
        {{ new Date(currentIterationInfo.endDate).toLocaleDateString('ru-RU') }}
        · {{ currentIterationInfo.iterationDays }} days
      </p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  analytics: {
    type: Object,
    required: true,
  },
  currentIterationInfo: {
    type: Object,
    default: null,
  },
})
</script>
