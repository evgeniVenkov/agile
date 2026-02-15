<template>
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
</template>

<script setup>
defineProps({
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
})

const emit = defineEmits(['createRelease', 'addStoryToRelease', 'removeRelease'])
</script>
