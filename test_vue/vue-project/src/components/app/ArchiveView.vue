<template>
  <div class="archive-view">
    <ArchiveReleasePanel
      :user-role="userRole"
      :current-project="currentProject"
      :release-form="releaseForm"
      :release-error="releaseError"
      :releases="releases"
      :release-story-drafts="releaseStoryDrafts"
      :available-stories-for-release="availableStoriesForRelease"
      :stories-in-release="storiesInRelease"
      @create-release="emit('createRelease')"
      @add-story-to-release="(releaseId) => emit('addStoryToRelease', releaseId)"
      @add-stories-to-release="(releaseId, storyIds) => emit('addStoriesToRelease', releaseId, storyIds)"
      @remove-story-from-release="(releaseId, storyId) => emit('removeStoryFromRelease', releaseId, storyId)"
      @remove-release="(releaseId) => emit('removeRelease', releaseId)"
    />

    <ArchiveAnalyticsPanel
      :archive-filters="archiveFilters"
      :archive-data="archiveData"
      @load-archive-analytics="emit('loadArchiveAnalytics')"
    />

    <ArchiveBurndownPanel
      :can-view-analytics="canViewAnalytics"
      :releases="releases"
      :selected-release-id="selectedReleaseId"
      :release-burndown-plot="releaseBurndownPlot"
      :release-burndown="releaseBurndown"
      :is-release-burndown-loading="isReleaseBurndownLoading"
      :release-burndown-error="releaseBurndownError"
      @update:selected-release-id="(value) => emit('update:selectedReleaseId', value)"
      @load-release-burndown="emit('loadReleaseBurndown')"
    />

    <ArchiveStatsPanel :archive-data="archiveData" />

    <ArchiveSpeedPanel
      :archive-data="archiveData"
      :current-project-info="currentProjectInfo"
      :archive-filters="archiveFilters"
    />

    <p v-if="isArchiveLoading" class="muted">Строим отчеты...</p>
    <p v-if="archiveError" class="error">{{ archiveError }}</p>

    <ArchiveVelocityPanel :archive-data="archiveData" />

    <ArchiveStoriesPanel
      :archive-data="archiveData"
      @remove-archived-story="(storyId) => emit('removeArchivedStory', storyId)"
    />
  </div>
</template>

<script setup>
import ArchiveAnalyticsPanel from './archive/ArchiveAnalyticsPanel.vue'
import ArchiveBurndownPanel from './archive/ArchiveBurndownPanel.vue'
import ArchiveReleasePanel from './archive/ArchiveReleasePanel.vue'
import ArchiveSpeedPanel from './archive/ArchiveSpeedPanel.vue'
import ArchiveStatsPanel from './archive/ArchiveStatsPanel.vue'
import ArchiveStoriesPanel from './archive/ArchiveStoriesPanel.vue'
import ArchiveVelocityPanel from './archive/ArchiveVelocityPanel.vue'

defineProps({
  userRole: {
    type: String,
    default: 'frontend-developer',
  },
  currentProject: {
    type: [String, Number],
    default: null,
  },
  currentProjectInfo: {
    type: Object,
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
  'addStoriesToRelease',
  'removeStoryFromRelease',
  'removeRelease',
  'loadArchiveAnalytics',
  'loadReleaseBurndown',
  'removeArchivedStory',
])
</script>
