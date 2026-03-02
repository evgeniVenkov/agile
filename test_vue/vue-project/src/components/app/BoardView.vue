<template>
  <div class="workspace">
    <BoardStatsPanel :analytics="analytics" :current-iteration-info="currentIterationInfo" />

    <p v-if="isBoardLoading" class="muted">Загружаем актуальные данные...</p>
    <p v-if="boardError" class="error">{{ boardError }}</p>
    <p v-if="infoMessage" class="info">{{ infoMessage }}</p>

    <section v-if="deletedStories.length" class="trash-bin">
      <div class="trash-bin-header">
        <h3>Корзина удалённых историй</h3>
        <span class="muted">Последние {{ deletedStories.length }} из 5</span>
      </div>
      <ul class="trash-bin-list">
        <li v-for="story in deletedStories" :key="story.binId" class="trash-bin-item">
          <div>
            <p class="trash-bin-title">{{ story.title }}</p>
            <p class="muted">Удалено: {{ new Date(story.deletedAt).toLocaleString('ru-RU') }}</p>
          </div>
          <button
            class="ghost-btn"
            type="button"
            @click="emit('restoreDeletedStory', story.binId)"
          >
            Восстановить
          </button>
        </li>
      </ul>
    </section>

    <div class="board">
      <BoardColumn
        v-for="column in boardColumns"
        :key="column.value"
        :column="column"
        :status-options="statusOptions"
        :collapsed-columns="collapsedColumns"
        :story-form="storyForm"
        :story-error="storyError"
        :editing-story-id="editingStoryId"
        :story-drafts="storyDrafts"
        :editing-estimate="editingEstimate"
        :estimate-drafts="estimateDrafts"
        :can-edit-story="canEditStory"
        :can-archive-story="canArchiveStory"
        :can-delete-story="canDeleteStory"
        :is-tasks-collapsed="isTasksCollapsed"
        :task-drafts="taskDrafts"
        :editing-task-assignment="editingTaskAssignment"
        :task-assignment-drafts="taskAssignmentDrafts"
        :available-members-for-assignment="availableMembersForAssignment"
        :current-user="currentUser"
        :user-role="userRole"
        :editing-task-title="editingTaskTitle"
        :task-title-drafts="taskTitleDrafts"
        @add-story="emit('addStory')"
        @toggle-column="(columnValue) => emit('toggleColumn', columnValue)"
        @update-story-status="(storyId, status) => emit('updateStoryStatus', storyId, status)"
        @start-editing-story="(story) => emit('startEditingStory', story)"
        @save-story="(storyId) => emit('saveStory', storyId)"
        @cancel-editing-story="(storyId) => emit('cancelEditingStory', storyId)"
        @start-editing-estimate="(storyId, estimate) => emit('startEditingEstimate', storyId, estimate)"
        @save-estimate="(storyId) => emit('saveEstimate', storyId)"
        @cancel-editing-estimate="(storyId) => emit('cancelEditingEstimate', storyId)"
        @toggle-tasks-collapsed="(storyId) => emit('toggleTasksCollapsed', storyId)"
        @add-task="(storyId) => emit('addTask', storyId)"
        @toggle-task="(storyId, taskId) => emit('toggleTask', storyId, taskId)"
        @remove-task="(storyId, taskId) => emit('removeTask', storyId, taskId)"
        @archive-story="(storyId) => emit('archiveStory', storyId)"
        @remove-story="(storyId) => emit('removeStory', storyId)"
        @start-assigning-task="(storyId, taskId, task) => emit('startAssigningTask', storyId, taskId, task)"
        @save-task-assignment="(storyId, taskId) => emit('saveTaskAssignment', storyId, taskId)"
        @cancel-assigning-task="(storyId, taskId) => emit('cancelAssigningTask', storyId, taskId)"
        @start-editing-task-title="(storyId, taskId, task) => emit('startEditingTaskTitle', storyId, taskId, task)"
        @save-task-title="(storyId, taskId) => emit('saveTaskTitle', storyId, taskId)"
        @cancel-editing-task-title="(storyId, taskId) => emit('cancelEditingTaskTitle', storyId, taskId)"
        @archive-done-stories="emit('archiveDoneStories')"
      />
    </div>
  </div>
</template>

<script setup>
import BoardColumn from './board/BoardColumn.vue'
import BoardStatsPanel from './board/BoardStatsPanel.vue'

defineProps({
  statusOptions: {
    type: Array,
    default: () => [],
  },
  boardColumns: {
    type: Array,
    default: () => [],
  },
  analytics: {
    type: Object,
    required: true,
  },
  currentIterationInfo: {
    type: Object,
    default: null,
  },
  isBoardLoading: {
    type: Boolean,
    default: false,
  },
  boardError: {
    type: String,
    default: '',
  },
  infoMessage: {
    type: String,
    default: '',
  },
  storyForm: {
    type: Object,
    required: true,
  },
  storyError: {
    type: String,
    default: '',
  },
  collapsedColumns: {
    type: Object,
    required: true,
  },
  editingStoryId: {
    type: [String, Number],
    default: null,
  },
  storyDrafts: {
    type: Object,
    required: true,
  },
  editingEstimate: {
    type: [String, Number],
    default: null,
  },
  estimateDrafts: {
    type: Object,
    required: true,
  },
  canEditStory: {
    type: Function,
    required: true,
  },
  canArchiveStory: {
    type: Boolean,
    default: false,
  },
  canDeleteStory: {
    type: Boolean,
    default: false,
  },
  isTasksCollapsed: {
    type: Function,
    required: true,
  },
  taskDrafts: {
    type: Object,
    required: true,
  },
  editingTaskAssignment: {
    type: [String, Number],
    default: null,
  },
  taskAssignmentDrafts: {
    type: Object,
    required: true,
  },
  availableMembersForAssignment: {
    type: Array,
    default: () => [],
  },
  currentUser: {
    type: Object,
    default: null,
  },
  userRole: {
    type: String,
    default: '',
  },
  editingTaskTitle: {
    type: [String, Number],
    default: null,
  },
  taskTitleDrafts: {
    type: Object,
    required: true,
  },
  deletedStories: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'addStory',
  'toggleColumn',
  'toggleTasksCollapsed',
  'updateStoryStatus',
  'startEditingStory',
  'saveStory',
  'cancelEditingStory',
  'startEditingEstimate',
  'saveEstimate',
  'cancelEditingEstimate',
  'addTask',
  'toggleTask',
  'removeTask',
  'archiveStory',
  'removeStory',
  'restoreDeletedStory',
  'startAssigningTask',
  'saveTaskAssignment',
  'cancelAssigningTask',
  'startEditingTaskTitle',
  'saveTaskTitle',
  'cancelEditingTaskTitle',
  'archiveDoneStories',
])
</script>
