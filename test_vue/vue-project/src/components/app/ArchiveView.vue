<template>
  <div class="archive-view">
    <div v-if="userRole === 'admin'" class="panel release-panel">
      <h2>Релизы</h2>
      <p v-if="!currentProject" class="muted">Выберите проект, чтобы управлять релизами.</p>
      <div class="release-form">
        <label>
          Название релиза
          <input
            v-model="releaseForm.name"
            placeholder="Например, Sprint 12"
            :disabled="!currentProject"
          />
        </label>
        <label>
          Дата релиза
          <input v-model="releaseForm.date" type="date" :disabled="!currentProject" />
        </label>
        <button
          class="primary small"
          type="button"
          :disabled="!currentProject"
          @click="emit('createRelease')"
        >
          Создать релиз
        </button>
      </div>
      <p v-if="releaseError" class="error">{{ releaseError }}</p>
      <div v-if="!releases.length" class="muted">Релизов пока нет.</div>
      <div v-else class="release-list">
        <article v-for="release in releases" :key="release.id" class="release-card">
          <div class="release-header">
            <div>
              <p class="release-title">{{ release.name }}</p>
              <p class="release-date">
                Дата: {{ new Date(release.releaseDate).toLocaleDateString('ru-RU') }}
              </p>
            </div>
            <button
              class="ghost-btn danger small"
              type="button"
              title="Удалить релиз"
              @click="emit('removeRelease', release.id)"
            >
              ✕
            </button>
          </div>
          <div class="release-stories">
            <p v-if="!storiesInRelease(release.id).length" class="muted">Историй нет.</p>
            <ul v-else class="release-story-list">
              <li v-for="story in storiesInRelease(release.id)" :key="story.id">
                {{ story.title }}
              </li>
            </ul>
          </div>
          <div class="release-add">
            <select v-model="releaseStoryDrafts[release.id]">
              <option :value="null">Выберите историю</option>
              <option v-for="story in availableStoriesForRelease" :key="story.id" :value="story.id">
                {{ story.title }}
              </option>
            </select>
            <button class="ghost-btn" type="button" @click="emit('addStoryToRelease', release.id)">
              Добавить
            </button>
          </div>
        </article>
      </div>
    </div>

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

    <div class="panel burndown-panel" v-if="canViewAnalytics">
      <h2>Выгорание релиза</h2>
      <div class="filters">
        <label>
          Релиз
          <select v-model="selectedReleaseIdModel">
            <option :value="null">Выберите релиз</option>
            <option v-for="release in releases" :key="release.id" :value="release.id">
              {{ release.name }} — {{ new Date(release.releaseDate).toLocaleDateString('ru-RU') }}
            </option>
          </select>
        </label>
        <button class="ghost-btn" type="button" @click="emit('loadReleaseBurndown')">Обновить</button>
      </div>
      <p class="muted" v-if="releaseBurndown.range">
        Период:
        {{ new Date(releaseBurndown.range.from).toLocaleDateString('ru-RU') }}
        —
        {{ new Date(releaseBurndown.range.to).toLocaleDateString('ru-RU') }}
      </p>
      <p v-if="isReleaseBurndownLoading" class="muted">Строим график...</p>
      <p v-if="releaseBurndownError" class="error">{{ releaseBurndownError }}</p>

      <div v-if="releaseBurndownPlot" class="burndown-chart">
        <svg
          :viewBox="`0 0 ${releaseBurndownPlot.width} ${releaseBurndownPlot.height}`"
          role="img"
          aria-label="Release burndown chart"
          class="burndown-svg"
        >
          <line
            :x1="releaseBurndownPlot.padding"
            :x2="releaseBurndownPlot.width - releaseBurndownPlot.padding"
            :y1="releaseBurndownPlot.height - releaseBurndownPlot.padding"
            :y2="releaseBurndownPlot.height - releaseBurndownPlot.padding"
            class="burndown-axis-line"
          />
          <polyline :points="releaseBurndownPlot.polyline" class="burndown-line" />
          <circle
            v-for="point in releaseBurndownPlot.points"
            :key="point.date"
            :cx="point.x"
            :cy="point.y"
            r="3"
            class="burndown-dot"
          />
        </svg>
        <div class="burndown-axis">
          <span>
            {{
              releaseBurndownPlot.points[0]?.date
                ? new Date(releaseBurndownPlot.points[0].date).toLocaleDateString('ru-RU')
                : ''
            }}
          </span>
          <span>
            {{
              releaseBurndownPlot.points[releaseBurndownPlot.points.length - 1]?.date
                ? new Date(
                    releaseBurndownPlot.points[releaseBurndownPlot.points.length - 1].date
                  ).toLocaleDateString('ru-RU')
                : ''
            }}
          </span>
        </div>
        <div class="burndown-legend">
          <span class="tag">Всего: {{ releaseBurndown.totalPoints }} SP</span>
          <span class="tag secondary">
            Осталось: {{ releaseBurndownPlot.points[releaseBurndownPlot.points.length - 1]?.value ?? 0 }} SP
          </span>
        </div>
      </div>
      <div v-else class="empty">Выберите релиз, чтобы построить график.</div>
    </div>

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

    <div class="speed-panel">
      <div class="speed-header">
        <h3>Скорость</h3>
        <select v-model="velocityUnit" class="speed-select">
          <option value="period">За период</option>
          <option value="week">За неделю</option>
          <option value="month">За месяц</option>
        </select>
      </div>
      <p class="speed-value">{{ speedValue }} SP / {{ velocityUnitLabel }}</p>
      <p class="muted">Среднее количество выполненных story points за период</p>
    </div>

    <p v-if="isArchiveLoading" class="muted">Строим отчеты...</p>
    <p v-if="archiveError" class="error">{{ archiveError }}</p>

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
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  userRole: {
    type: String,
    default: 'frontend-developer',
  },
  currentProject: {
    type: [String, Number],
    default: null,
  },
  releaseForm: {
    type: Object,
    required: true,
  },
  releaseError: {
    type: String,
    default: '',
  },
  releases: {
    type: Array,
    default: () => [],
  },
  releaseStoryDrafts: {
    type: Object,
    required: true,
  },
  availableStoriesForRelease: {
    type: Array,
    default: () => [],
  },
  storiesInRelease: {
    type: Function,
    required: true,
  },
  archiveFilters: {
    type: Object,
    required: true,
  },
  archiveData: {
    type: Object,
    required: true,
  },
  isArchiveLoading: {
    type: Boolean,
    default: false,
  },
  archiveError: {
    type: String,
    default: '',
  },
  canViewAnalytics: {
    type: Boolean,
    default: false,
  },
  releaseBurndownPlot: {
    type: Object,
    default: null,
  },
  releaseBurndown: {
    type: Object,
    required: true,
  },
  isReleaseBurndownLoading: {
    type: Boolean,
    default: false,
  },
  releaseBurndownError: {
    type: String,
    default: '',
  },
  selectedReleaseId: {
    type: [String, Number],
    default: null,
  },
})

const emit = defineEmits([
  'update:selectedReleaseId',
  'createRelease',
  'addStoryToRelease',
  'removeRelease',
  'loadArchiveAnalytics',
  'loadReleaseBurndown',
  'removeArchivedStory',
])

const selectedReleaseIdModel = computed({
  get: () => props.selectedReleaseId,
  set: (value) => emit('update:selectedReleaseId', value),
})

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

const velocityUnit = ref('week')
const velocityUnitLabel = computed(() => {
  if (velocityUnit.value === 'period') return 'период'
  if (velocityUnit.value === 'month') return 'месяц'
  return 'неделю'
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

  const range = parseRange()
  if (!range) return '0'

  const startUtc = Date.UTC(
    range.fromDate.getUTCFullYear(),
    range.fromDate.getUTCMonth(),
    range.fromDate.getUTCDate()
  )
  const endUtc = Date.UTC(
    range.toDate.getUTCFullYear(),
    range.toDate.getUTCMonth(),
    range.toDate.getUTCDate()
  )

  const days = Math.max(1, Math.floor((endUtc - startUtc) / 86400000) + 1)

  let divisor = 1
  if (velocityUnit.value === 'period') {
    divisor = 1
  } else if (velocityUnit.value === 'month') {
    const startMonth = range.fromDate.getUTCFullYear() * 12 + range.fromDate.getUTCMonth()
    const endMonth = range.toDate.getUTCFullYear() * 12 + range.toDate.getUTCMonth()
    divisor = Math.max(1, endMonth - startMonth + 1)
  } else {
    divisor = Math.max(1, days / 7)
  }

  const value = totalPoints / divisor
  if (!Number.isFinite(value)) return '0'
  const formatted = value.toFixed(1)
  return formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted
})
</script>
