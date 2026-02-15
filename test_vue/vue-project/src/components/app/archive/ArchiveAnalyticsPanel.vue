<template>
  <div class="panel archive-panel">
    <h2>Аналитика архива</h2>
    <div class="filters">
      <label>
        С даты
        <input v-model="archiveFilters.from" type="date" />
      </label>
      <label>
        По дату
        <input v-model="archiveFilters.to" type="date" />
      </label>
      <button class="ghost-btn" type="button" @click="emit('loadArchiveAnalytics')">Обновить</button>
    </div>
    <div class="filters quick-filters">
      <button class="ghost-btn" type="button" @click="setPreviousWeek">Пред. неделя</button>
      <button class="ghost-btn" type="button" @click="setPreviousMonth">Пред. месяц</button>
    </div>
    <p class="muted" v-if="archiveData.range">
      Период: {{ new Date(archiveData.range.from).toLocaleDateString('ru-RU') }} —
      {{ new Date(archiveData.range.to).toLocaleDateString('ru-RU') }}
    </p>
  </div>
</template>

<script setup>
const props = defineProps({
  archiveFilters: {
    type: Object,
    required: true,
  },
  archiveData: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['loadArchiveAnalytics'])

const toIsoDate = (date) => date.toISOString().slice(0, 10)

const setPreviousWeek = () => {
  const end = new Date()
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000)
  props.archiveFilters.from = toIsoDate(start)
  props.archiveFilters.to = toIsoDate(end)
  emit('loadArchiveAnalytics')
}

const setPreviousMonth = () => {
  const end = new Date()
  const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000)
  props.archiveFilters.from = toIsoDate(start)
  props.archiveFilters.to = toIsoDate(end)
  emit('loadArchiveAnalytics')
}
</script>
