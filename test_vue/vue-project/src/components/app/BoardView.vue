<template>
  <div class="workspace">
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
    </div>
    <p v-if="isBoardLoading" class="muted">Загружаем актуальные данные...</p>
    <p v-if="boardError" class="error">{{ boardError }}</p>
    <p v-if="infoMessage" class="info">{{ infoMessage }}</p>

    <div class="grid">
      <div class="panel" :class="{ collapsed: isPanelCollapsed }">
        <div class="panel-header">
          <h2>Новая пользовательская история</h2>
          <button
            class="collapse-btn"
            type="button"
            @click="emit('togglePanel')"
            :aria-label="isPanelCollapsed ? 'Развернуть' : 'Свернуть'"
          >
            {{ isPanelCollapsed ? '▼' : '▲' }}
          </button>
        </div>
        <form v-show="!isPanelCollapsed" class="story-form" @submit.prevent="emit('addStory')">
          <label>
            Название
            <input v-model="storyForm.title" placeholder="Как пользователь, я хочу..." />
          </label>
          <div class="inline">
            <label>
              Story Points
              <input v-model.number="storyForm.estimate" min="1" type="number" />
            </label>
            <label>
              Статус
              <select v-model="storyForm.status">
                <option v-for="status in statusOptions" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </label>
          </div>
          <button class="primary" type="submit">Добавить</button>
          <p v-if="storyError" class="error">{{ storyError }}</p>
        </form>
      </div>

      <div class="board" :class="{ 'panel-expanded': !isPanelCollapsed }">
        <div
          v-for="column in boardColumns"
          :key="column.value"
          class="column"
          :style="{ borderColor: column.accent }"
        >
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

          <p v-if="collapsedColumns[column.value]" class="empty collapsed">
            Колонка свернута
          </p>

          <div v-else>
            <p v-if="!column.stories.length" class="empty">Пока нет историй</p>

            <article v-for="story in column.stories" :key="story.id" class="story-card">
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
                <select
                  :value="story.status"
                  @change="emit('updateStoryStatus', story.id, $event.target.value)"
                >
                  <option
                    v-for="status in statusOptions"
                    :key="status.value"
                    :value="status.value"
                  >
                    {{ status.label }}
                  </option>
                </select>
              </div>
              <div class="story-meta">
                <span
                  v-if="editingEstimate !== story.id"
                  class="tag editable"
                  @click="emit('startEditingEstimate', story.id, story.estimate)"
                  title="Нажмите, чтобы изменить оценку"
                >
                  {{ story.estimate }} SP
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
                  <button
                    class="estimate-save"
                    type="button"
                    @click="emit('saveEstimate', story.id)"
                    title="Сохранить"
                  >
                    ✓
                  </button>
                  <button
                    class="estimate-cancel"
                    type="button"
                    @click="emit('cancelEditingEstimate', story.id)"
                    title="Отмена"
                  >
                    ✕
                  </button>
                </div>
                <span class="tag secondary">
                  Задач: {{ story.tasks.length }} · Завершено:
                  {{ story.tasks.filter((task) => task.done).length }}
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
                <button
                  v-if="canDeleteStory"
                  class="ghost-btn danger"
                  type="button"
                  @click="emit('removeStory', story.id)"
                >
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
                  <button class="ghost-btn" type="button" @click="emit('saveStory', story.id)">
                    Сохранить
                  </button>
                  <button class="ghost-btn" type="button" @click="emit('cancelEditingStory', story.id)">
                    Отмена
                  </button>
                </template>
              </div>

              <div v-if="!isTasksCollapsed(story.id)" class="tasks-block">
                <ul class="tasks">
                  <li v-for="task in story.tasks" :key="task.id" class="task-item">
                    <div class="task-content">
                      <label class="task-label">
                        <input
                          :checked="task.done"
                          type="checkbox"
                          @change="emit('toggleTask', story.id, task.id)"
                        />
                        <div class="task-title">
                          <template v-if="editingTaskTitle === `${story.id}-${task.id}`">
                            <input
                              v-model="taskTitleDrafts[`${story.id}-${task.id}`]"
                              class="task-title-input"
                              @keyup.enter="emit('saveTaskTitle', story.id, task.id)"
                              @keyup.esc="emit('cancelEditingTaskTitle', story.id, task.id)"
                            />
                            <button
                              class="task-title-save"
                              type="button"
                              @click="emit('saveTaskTitle', story.id, task.id)"
                            >
                              Сохранить
                            </button>
                            <button
                              class="task-title-cancel"
                              type="button"
                              @click="emit('cancelEditingTaskTitle', story.id, task.id)"
                            >
                              Отмена
                            </button>
                          </template>
                          <template v-else>
                            <span
                              :class="{ done: task.done }"
                              class="task-title-text"
                              @click="emit('startEditingTaskTitle', story.id, task.id, task)"
                            >
                              {{ task.title }}
                            </span>
                          </template>
                        </div>
                      </label>
                      <div v-if="editingTaskAssignment !== `${story.id}-${task.id}`" class="task-info">
                        <div v-if="task.assignedToUsername" class="task-assigned">
                          <span class="task-assigned-label">Исполнитель:</span>
                          <span class="task-assigned-user">{{ task.assignedToUsername }}</span>
                        </div>
                        <div v-if="task.estimatedCompletionDate" class="task-deadline">
                          <span class="task-deadline-label">До:</span>
                          <span class="task-deadline-date">
                            {{ new Date(task.estimatedCompletionDate).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }) }}
                          </span>
                        </div>
                        <button
                          class="task-assign-btn"
                          type="button"
                          @click="emit('startAssigningTask', story.id, task.id, task)"
                          title="Назначить задачу"
                        >
                          {{ task.assignedTo ? 'Изменить' : 'Взять в работу' }}
                        </button>
                      </div>
                      <div v-else class="task-assignment-form">
                        <div class="task-assignment-fields">
                          <label class="task-assignment-field">
                            <span>Исполнитель:</span>
                            <select
                              v-model="taskAssignmentDrafts[`${story.id}-${task.id}`].assignedTo"
                              class="task-assign-select"
                            >
                              <option :value="null">Не назначено</option>
                              <option v-if="currentUser" :value="currentUser.id">
                                {{ currentUser.username }} (Я)
                              </option>
                              <option
                                v-for="member in availableMembersForAssignment"
                                :key="member.userId"
                                :value="member.userId"
                              >
                                {{ member.username }}
                              </option>
                            </select>
                          </label>
                          <label class="task-assignment-field">
                            <span>Дата выполнения:</span>
                            <input
                              v-model="taskAssignmentDrafts[`${story.id}-${task.id}`].estimatedCompletionDate"
                              type="datetime-local"
                              class="task-deadline-input"
                            />
                          </label>
                        </div>
                        <div class="task-assignment-actions">
                          <button
                            class="task-save-btn"
                            type="button"
                            @click="emit('saveTaskAssignment', story.id, task.id)"
                          >
                            Сохранить
                          </button>
                          <button
                            class="task-cancel-btn"
                            type="button"
                            @click="emit('cancelAssigningTask', story.id, task.id)"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      class="task-remove"
                      type="button"
                      @click="emit('removeTask', story.id, task.id)"
                    >
                      ✕
                    </button>
                  </li>
                </ul>

                <div class="task-adder">
                  <input
                    v-model="taskDrafts[story.id]"
                    placeholder="Новая задача"
                    @keyup.enter.prevent="emit('addTask', story.id)"
                  />
                  <button type="button" @click="emit('addTask', story.id)">Добавить</button>
                </div>
              </div>
              <div v-else class="tasks-collapsed">
                Задачи скрыты
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
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
  isPanelCollapsed: {
    type: Boolean,
    default: false,
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
  'togglePanel',
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
  'startAssigningTask',
  'saveTaskAssignment',
  'cancelAssigningTask',
  'startEditingTaskTitle',
  'saveTaskTitle',
  'cancelEditingTaskTitle',
])
</script>
