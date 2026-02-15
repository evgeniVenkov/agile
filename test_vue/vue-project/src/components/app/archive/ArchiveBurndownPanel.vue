<template>
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
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  canViewAnalytics: {
    type: Boolean,
    default: false,
  },
  releases: {
    type: Array,
    default: () => [],
  },
  selectedReleaseId: {
    type: [String, Number],
    default: null,
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
})

const emit = defineEmits(['update:selectedReleaseId', 'loadReleaseBurndown'])

const selectedReleaseIdModel = computed({
  get: () => props.selectedReleaseId,
  set: (value) => emit('update:selectedReleaseId', value),
})
</script>
