<template>
  <div class="project-selector">
    <div class="project-selector-content">
      <label class="project-label">
        Проект:
        <select v-model="currentProjectModel" @change="emit('selectProject')" class="project-select">
          <option :value="null">Без проекта</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
      </label>
      <template v-if="userRole === 'admin' && currentProjectModel">
        <button
          v-if="!isEditingProjectName"
          class="ghost-btn"
          type="button"
          @click="emit('startEditProjectName')"
        >
          Переименовать
        </button>
        <div v-else class="project-edit">
          <input
            v-model="projectNameDraftModel"
            class="project-edit-input"
            placeholder="Новое название проекта"
          />
          <button class="ghost-btn" type="button" @click="emit('saveProjectName')">Сохранить</button>
          <button class="ghost-btn danger" type="button" @click="emit('cancelEditProjectName')">
            Отмена
          </button>
        </div>
      </template>
      <button class="primary small" type="button" @click="openProjectModal">
        + Создать проект
      </button>
    </div>
  </div>

  <div v-if="showProjectModalModel" class="modal-overlay" @click="closeProjectModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Создать новый проект</h2>
        <button class="modal-close" type="button" @click="closeProjectModal">×</button>
      </div>
      <form class="project-form" @submit.prevent="emit('createProject')">
        <label>
          Название проекта
          <input v-model="projectForm.name" placeholder="Название проекта" required />
        </label>
        <label>
          Описание <span class="optional">(необязательно)</span>
          <textarea
            v-model="projectForm.description"
            rows="3"
            placeholder="Краткое описание проекта"
          />
        </label>
        <div class="modal-actions">
          <button class="primary" type="submit">Создать</button>
          <button class="ghost-btn" type="button" @click="closeProjectModal">Отмена</button>
        </div>
        <p v-if="projectError" class="error">{{ projectError }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentProject: {
    type: [String, Number],
    default: null,
  },
  projects: {
    type: Array,
    default: () => [],
  },
  userRole: {
    type: String,
    default: 'frontend-developer',
  },
  isEditingProjectName: {
    type: Boolean,
    default: false,
  },
  projectNameDraft: {
    type: String,
    default: '',
  },
  projectForm: {
    type: Object,
    required: true,
  },
  projectError: {
    type: String,
    default: '',
  },
  showProjectModal: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'update:currentProject',
  'update:projectNameDraft',
  'update:showProjectModal',
  'selectProject',
  'startEditProjectName',
  'saveProjectName',
  'cancelEditProjectName',
  'createProject',
])

const currentProjectModel = computed({
  get: () => props.currentProject,
  set: (value) => emit('update:currentProject', value),
})

const projectNameDraftModel = computed({
  get: () => props.projectNameDraft,
  set: (value) => emit('update:projectNameDraft', value),
})

const showProjectModalModel = computed({
  get: () => props.showProjectModal,
  set: (value) => emit('update:showProjectModal', value),
})

const openProjectModal = () => {
  showProjectModalModel.value = true
}

const closeProjectModal = () => {
  showProjectModalModel.value = false
}
</script>
