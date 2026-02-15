<template>
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
                {{
                  new Date(task.estimatedCompletionDate).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }}
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

        <button class="task-remove" type="button" @click="emit('removeTask', story.id, task.id)">
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
  <div v-else class="tasks-collapsed">Задачи скрыты</div>
</template>

<script setup>
defineProps({
  story: {
    type: Object,
    required: true,
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
</script>
