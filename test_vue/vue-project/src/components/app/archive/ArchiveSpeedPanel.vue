<template>
  <div class="speed-panel">
    <div class="speed-header">
      <h3>Скорость</h3>
    </div>
    <p class="speed-value">{{ speedValue }} SP / Итерация</p>
    <p class="muted">
      Среднее количество очков за выполненную историю за итерацию в течение срока службы доски
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  archiveData: {
    type: Object,
    required: true,
  },
  currentProjectInfo: {
    type: Object,
    default: null,
  },
  archiveFilters: {
    type: Object,
    required: true,
  },
})

const parseRange = () => {
  const rawFrom = props.archiveData?.range?.from ?? props.archiveFilters?.from ?? null
  const rawTo = props.archiveData?.range?.to ?? props.archiveFilters?.to ?? null
  if (!rawFrom || !rawTo) return null

  let fromDate = new Date(rawFrom)
  let toDate = new Date(rawTo)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return null
  }
  if (fromDate > toDate) {
    const temp = fromDate
    fromDate = toDate
    toDate = temp
  }
  return { fromDate, toDate }
}

const speedValue = computed(() => {
  const totalPoints = props.archiveData?.summary?.totalPoints ?? 0
  if (!totalPoints) return '0'

  const rawCreatedAt = props.currentProjectInfo?.createdAt ?? null
  let boardStartDate = rawCreatedAt ? new Date(rawCreatedAt) : null
  if (!boardStartDate || Number.isNaN(boardStartDate.getTime())) {
    const range = parseRange()
    boardStartDate = range?.fromDate ?? null
  }
  if (!boardStartDate) return '0'

  const now = new Date()
  if (boardStartDate > now) {
    boardStartDate = now
  }

  const rawIterationDays = Number.parseInt(props.currentProjectInfo?.iterationDays, 10)
  const iterationDays =
    Number.isFinite(rawIterationDays) && rawIterationDays >= 1 ? rawIterationDays : 14

  const startUtc = Date.UTC(
    boardStartDate.getUTCFullYear(),
    boardStartDate.getUTCMonth(),
    boardStartDate.getUTCDate()
  )
  const endUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())

  const days = Math.max(1, Math.floor((endUtc - startUtc) / 86400000) + 1)
  const iterations = Math.max(1, Math.ceil(days / iterationDays))

  const value = totalPoints / iterations
  if (!Number.isFinite(value)) return '0'
  const formatted = value.toFixed(1)
  return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted
})
</script>
