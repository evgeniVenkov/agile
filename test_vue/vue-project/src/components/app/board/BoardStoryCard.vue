<template>
  <article class="story-card">
    <div class="story-header">
      <div>
        <template v-if="editingStoryId === story.id">
          <input
            v-model="storyDrafts[story.id].title"
            class="story-edit-input"
            placeholder="Название истории"
          />
        </template>
        <template v-else>
          <p
            class="story-title"
            :class="{ 'story-editable': canEditStory(story) }"
            @click="canEditStory(story) && emit('startEditingStory', story)"
          >
            {{ story.title }}
          </p>
          <p class="story-owner">Автор: {{ story.owner }}</p>
        </template>
      </div>
      <select :value="story.status" @change="emit('updateStoryStatus', story.id, $event.target.value)">
        <option v-for="status in statusOptions" :key="status.value" :value="status.value">
          {{ status.label }}
        </option>
      </select>
    </div>

    <div class="story-meta">
      <span
        v-if="editingEstimate !== story.id"
        class="tag"
        :class="{ editable: canEditEstimate }"
        :title="canEditEstimate ? 'Нажмите, чтобы изменить оценку' : 'Оценка в бэклоге недоступна'"
        @click="canEditEstimate && emit('startEditingEstimate', story.id, story.estimate)"
      >
        {{ estimateLabel }}
      </span>
      <div v-else class="estimate-editor">
        <input
          v-model.number="estimateDrafts[story.id]"
          type="number"
          min="1"
          class="estimate-input"
          @keyup.enter="emit('saveEstimate', story.id)"
          @keyup.esc="emit('cancelEditingEstimate', story.id)"
          @blur="emit('saveEstimate', story.id)"
          autofocus
        />
        <span class="estimate-label">SP</span>
        <button class="estimate-save" type="button" @click="emit('saveEstimate', story.id)" title="Сохранить">✓</button>
        <button class="estimate-cancel" type="button" @click="emit('cancelEditingEstimate', story.id)" title="Отмена">✕</button>
      </div>
      <span class="tag secondary">
        Задач: {{ story.tasks.length }} · Завершено: {{ story.tasks.filter((task) => task.done).length }}
      </span>
      <button
        class="task-toggle"
        type="button"
        :aria-expanded="!isTasksCollapsed(story.id)"
        @click="emit('toggleTasksCollapsed', story.id)"
      >
        {{ isTasksCollapsed(story.id) ? 'Развернуть задачи' : 'Свернуть задачи' }}
      </button>
    </div>

    <div v-if="showPlanningPokerDetails" class="poker-estimates">
      <span v-for="vote in story.estimates" :key="`${story.id}-${vote.userId}`" class="tag secondary">
        {{ vote.username }}: {{ vote.estimate }} SP
      </span>
    </div>

    <div v-if="canArchiveStory || canDeleteStory" class="story-actions">
      <button
        v-if="canArchiveStory"
        class="ghost-btn"
        type="button"
        :disabled="story.status !== 'done'"
        @click="emit('archiveStory', story.id)"
      >
        В архив
      </button>
      <button v-if="canDeleteStory" class="ghost-btn danger" type="button" @click="emit('removeStory', story.id)">
        Удалить
      </button>
      <button
        v-if="editingStoryId !== story.id && canEditStory(story)"
        class="ghost-btn"
        type="button"
        @click="emit('startEditingStory', story)"
      >
        Редактировать
      </button>
      <template v-else-if="editingStoryId === story.id">
        <button class="ghost-btn" type="button" @click="emit('saveStory', story.id)">Сохранить</button>
        <button class="ghost-btn" type="button" @click="emit('cancelEditingStory', story.id)">Отмена</button>
      </template>
    </div>

    <BoardStoryTasks
      :story="story"
      :is-tasks-collapsed="isTasksCollapsed"
      :task-drafts="taskDrafts"
      :editing-task-assignment="editingTaskAssignment"
      :task-assignment-drafts="taskAssignmentDrafts"
      :available-members-for-assignment="availableMembersForAssignment"
      :current-user="currentUser"
      :editing-task-title="editingTaskTitle"
      :task-title-drafts="taskTitleDrafts"
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
  </article>
</template>

<script setup>
import { computed } from 'vue'
import BoardStoryTasks from './BoardStoryTasks.vue'

const props = defineProps({
  story: {
    type: Object,
    required: true,
  },
  statusOptions: {
    type: Array,
    default: () => [],
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
})

const emit = defineEmits([
  'updateStoryStatus',
  'startEditingStory',
  'startEditingEstimate',
  'saveEstimate',
  'cancelEditingEstimate',
  'toggleTasksCollapsed',
  'archiveStory',
  'removeStory',
  'saveStory',
  'cancelEditingStory',
  'toggleTask',
  'startEditingTaskTitle',
  'saveTaskTitle',
  'cancelEditingTaskTitle',
  'startAssigningTask',
  'saveTaskAssignment',
  'cancelAssigningTask',
  'removeTask',
  'addTask',
])

const isPlanningPokerStory = computed(() => props.story.status === 'ready')
const isPrivilegedViewer = computed(() => ['admin', 'team-lead'].includes(props.userRole))
const canEditEstimate = computed(() => props.story.status !== 'backlog')

const estimateLabel = computed(() => {
  if (!isPlanningPokerStory.value) {
    return `${props.story.estimate ?? 0} SP`
  }

  if (isPrivilegedViewer.value) {
    return `Покер: ${props.story.estimate ?? 0} SP`
  }

  if (props.story.estimate === null || props.story.estimate === undefined) {
    return 'Моя оценка: —'
  }

  return `Моя оценка: ${props.story.estimate} SP`
})

const showPlanningPokerDetails = computed(
  () =>
    isPlanningPokerStory.value &&
    isPrivilegedViewer.value &&
    Array.isArray(props.story.estimates) &&
    props.story.estimates.length > 0
)
</script>
