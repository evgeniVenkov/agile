<template>
  <div class="column" :style="{ borderColor: column.accent }">
    <div class="column-head">
      <div>
        <p class="label">{{ column.label }}</p>
        <p class="muted">{{ column.subtitle }}</p>
      </div>
      <div class="column-actions">
        <div class="badge" :style="{ color: column.accent }">
          {{ column.stories.length }} · {{ column.estimate }} SP
        </div>
        <button class="collapse-btn" type="button" @click="emit('toggleColumn', column.value)">
          {{ collapsedColumns[column.value] ? 'Развернуть' : 'Свернуть' }}
        </button>
      </div>
    </div>

    <p v-if="collapsedColumns[column.value]" class="empty collapsed">Колонка свернута</p>

    <div v-else>
      <div v-if="column.value === 'backlog'" class="backlog-adder">
        <form class="story-form inline" @submit.prevent="addBacklogStory">
          <input v-model="storyForm.title" placeholder="Как пользователь, я хочу..." />
          <input v-model.number="storyForm.estimate" min="1" type="number" />
          <button class="primary" type="submit">Добавить</button>
        </form>
        <p v-if="storyError" class="error">{{ storyError }}</p>
      </div>

      <p v-if="!column.stories.length" class="empty">Пока нет историй</p>

      <BoardStoryCard
        v-for="story in column.stories"
        :key="story.id"
        :story="story"
        :status-options="statusOptions"
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
        :editing-task-title="editingTaskTitle"
        :task-title-drafts="taskTitleDrafts"
        @update-story-status="(storyId, status) => emit('updateStoryStatus', storyId, status)"
        @start-editing-story="(story) => emit('startEditingStory', story)"
        @start-editing-estimate="(storyId, estimate) => emit('startEditingEstimate', storyId, estimate)"
        @save-estimate="(storyId) => emit('saveEstimate', storyId)"
        @cancel-editing-estimate="(storyId) => emit('cancelEditingEstimate', storyId)"
        @toggle-tasks-collapsed="(storyId) => emit('toggleTasksCollapsed', storyId)"
        @archive-story="(storyId) => emit('archiveStory', storyId)"
        @remove-story="(storyId) => emit('removeStory', storyId)"
        @save-story="(storyId) => emit('saveStory', storyId)"
        @cancel-editing-story="(storyId) => emit('cancelEditingStory', storyId)"
        @toggle-task="(storyId, taskId) => emit('toggleTask', storyId, taskId)"
        @start-editing-task-title="(storyId, taskId, task) => emit('startEditingTaskTitle', storyId, taskId, task)"
        @save-task-title="(storyId, taskId) => emit('saveTaskTitle', storyId, taskId)"
        @cancel-editing-task-title="(storyId, taskId) => emit('cancelEditingTaskTitle', storyId, taskId)"
        @start-assigning-task="(storyId, taskId, task) => emit('startAssigningTask', storyId, taskId, task)"
        @save-task-assignment="(storyId, taskId) => emit('saveTaskAssignment', storyId, taskId)"
        @cancel-assigning-task="(storyId, taskId) => emit('cancelAssigningTask', storyId, taskId)"
        @remove-task="(storyId, taskId) => emit('removeTask', storyId, taskId)"
        @add-task="(storyId) => emit('addTask', storyId)"
      />
    </div>
  </div>
</template>

<script setup>
import BoardStoryCard from './BoardStoryCard.vue'

const props = defineProps({
  column: {
    type: Object,
    required: true,
  },
  statusOptions: {
    type: Array,
    default: () => [],
  },
  collapsedColumns: {
    type: Object,
    required: true,
  },
  storyForm: {
    type: Object,
    required: true,
  },
  storyError: {
    type: String,
    default: '',
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
  editingTaskTitle: {
    type: [String, Number],
    default: null,
  },
  taskTitleDrafts: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits([
  'addStory',
  'toggleColumn',
  'updateStoryStatus',
  'startEditingStory',
  'saveStory',
  'cancelEditingStory',
  'startEditingEstimate',
  'saveEstimate',
  'cancelEditingEstimate',
  'toggleTasksCollapsed',
  'addTask',
  'toggleTask',
  'removeTask',
  'archiveStory',
  'removeStory',
  'startAssigningTask',
  'saveTaskAssignment',
  'cancelAssigningTask',
  'startEditingTaskTitle',
  'saveTaskTitle',
  'cancelEditingTaskTitle',
])

const addBacklogStory = () => {
  props.storyForm.status = 'backlog'
  emit('addStory')
}
</script>
