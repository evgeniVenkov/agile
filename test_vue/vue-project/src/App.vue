<script setup>
import AppHeader from './components/app/AppHeader.vue'
import AuthSection from './components/app/AuthSection.vue'
import ProjectSection from './components/app/ProjectSection.vue'
import BoardView from './components/app/BoardView.vue'
import ArchiveView from './components/app/ArchiveView.vue'
import SettingsView from './components/app/SettingsView.vue'
import { useAppController } from './composables/useAppController'
const {
  SESSION_KEY,
  DAY_MS,
  canUseStorage,
  readSession,
  persistSession,
  statusOptions,
  stories,
  projects,
  currentProject,
  currentUser,
  currentPage,
  authMode,
  loginForm,
  registerForm,
  projectForm,
  projectNameDraft,
  isEditingProjectName,
  releases,
  releaseForm,
  releaseError,
  releaseBurndownError,
  releaseStoryDrafts,
  storyForm,
  taskDrafts,
  collapsedTasks,
  editingEstimate,
  estimateDrafts,
  editingStoryId,
  storyDrafts,
  settingsForm,
  projectSettingsForm,
  showLoginPassword,
  showSettingsPassword,
  authError,
  registerError,
  storyError,
  projectError,
  infoMessage,
  boardError,
  archiveError,
  settingsError,
  settingsSuccess,
  projectSettingsError,
  projectSettingsSuccess,
  isBoardLoading,
  isArchiveLoading,
  isReleaseBurndownLoading,
  isProjectsLoading,
  showProjectModal,
  projectMembers,
  isMembersLoading,
  memberForm,
  memberError,
  memberSuccess,
  availableMembersForAssignment,
  currentProjectInfo,
  today,
  isoDate,
  defaultArchiveTo,
  defaultArchiveFrom,
  archiveFilters,
  archiveData,
  releaseBurndown,
  selectedReleaseId,
  collapsedColumns,
  userRole,
  currentIterationInfo,
  loadProjects,
  loadStories,
  handleCreateProject,
  handleSelectProject,
  loadReleases,
  createRelease,
  addStoryToRelease,
  removeRelease,
  startEditingProjectName,
  cancelEditingProjectName,
  saveProjectName,
  saveProjectIterationSettings,
  loadProjectMembers,
  handleAddMember,
  handleRemoveMember,
  getRoleLabel,
  loadArchiveAnalytics,
  loadReleaseBurndown,
  boardColumns,
  analytics,
  releaseBurndownPlot,
  availableStoriesForRelease,
  storiesInRelease,
  userRoleLabel,
  isTasksCollapsed,
  toggleTasksCollapsed,
  canDeleteStory,
  canArchiveStory,
  canViewAnalytics,
  canEditStory,
  resetErrors,
  switchMode,
  handleRegister,
  handleLogin,
  logout,
  saveSettings,
  addStory,
  updateStoryStatus,
  startEditingEstimate,
  cancelEditingEstimate,
  startEditingStory,
  cancelEditingStory,
  saveStory,
  saveEstimate,
  addTaskToStory,
  toggleTask,
  removeTask,
  editingTaskAssignment,
  taskAssignmentDrafts,
  editingTaskTitle,
  taskTitleDrafts,
  startAssigningTask,
  cancelAssigningTask,
  saveTaskAssignment,
  startEditingTaskTitle,
  cancelEditingTaskTitle,
  saveTaskTitle,
  removeStory,
  archiveStory,
  removeArchivedStory,
  toggleColumn
} = useAppController()
</script>
<template>
  <div class="shell">
    <AppHeader
      :current-user="currentUser"
      :user-role-label="userRoleLabel"
      @logout="logout"
    />

    <AuthSection
      v-if="!currentUser"
      :auth-mode="authMode"
      :login-form="loginForm"
      :register-form="registerForm"
      :show-login-password="showLoginPassword"
      :auth-error="authError"
      :register-error="registerError"
      :info-message="infoMessage"
      @switch-mode="switchMode"
      @login="handleLogin"
      @register="handleRegister"
      @toggle-login-password="showLoginPassword = !showLoginPassword"
    />

    <section v-else>
      <ProjectSection
        v-model:currentProject="currentProject"
        v-model:showProjectModal="showProjectModal"
        v-model:projectNameDraft="projectNameDraft"
        :projects="projects"
        :user-role="userRole"
        :is-editing-project-name="isEditingProjectName"
        :project-form="projectForm"
        :project-error="projectError"
        @select-project="handleSelectProject"
        @start-edit-project-name="startEditingProjectName"
        @save-project-name="saveProjectName"
        @cancel-edit-project-name="cancelEditingProjectName"
        @create-project="handleCreateProject"
      />

      <div class="page-switch">
        <button
          class="tab"
          :class="{ active: currentPage === 'board' }"
          type="button"
          @click="currentPage = 'board'"
        >
          Доска
        </button>
        <button
          v-if="canViewAnalytics"
          class="tab"
          :class="{ active: currentPage === 'archive' }"
          type="button"
          @click="currentPage = 'archive'"
        >
          Аналитика Архива
        </button>
        <button
          class="tab"
          :class="{ active: currentPage === 'settings' }"
          type="button"
          @click="currentPage = 'settings'"
        >
          Настройки
        </button>
      </div>

      <BoardView
        v-if="currentPage === 'board'"
        :status-options="statusOptions"
        :board-columns="boardColumns"
        :analytics="analytics"
        :current-iteration-info="currentIterationInfo"
        :is-board-loading="isBoardLoading"
        :board-error="boardError"
        :info-message="infoMessage"
        :story-form="storyForm"
        :story-error="storyError"
        :collapsed-columns="collapsedColumns"
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
        @add-story="addStory"
        @toggle-column="toggleColumn"
        @toggle-tasks-collapsed="toggleTasksCollapsed"
        @update-story-status="updateStoryStatus"
        @start-editing-story="startEditingStory"
        @save-story="saveStory"
        @cancel-editing-story="cancelEditingStory"
        @start-editing-estimate="startEditingEstimate"
        @save-estimate="saveEstimate"
        @cancel-editing-estimate="cancelEditingEstimate"
        @add-task="addTaskToStory"
        @toggle-task="toggleTask"
        @remove-task="removeTask"
        @archive-story="archiveStory"
        @remove-story="removeStory"
        @start-assigning-task="startAssigningTask"
        @save-task-assignment="saveTaskAssignment"
        @cancel-assigning-task="cancelAssigningTask"
        @start-editing-task-title="startEditingTaskTitle"
        @save-task-title="saveTaskTitle"
        @cancel-editing-task-title="cancelEditingTaskTitle"
      />

      <ArchiveView
        v-else-if="currentPage === 'archive'"
        v-model:selectedReleaseId="selectedReleaseId"
        :user-role="userRole"
        :current-project="currentProject"
        :current-project-info="currentProjectInfo"
        :release-form="releaseForm"
        :release-error="releaseError"
        :releases="releases"
        :release-story-drafts="releaseStoryDrafts"
        :available-stories-for-release="availableStoriesForRelease"
        :stories-in-release="storiesInRelease"
        :archive-filters="archiveFilters"
        :archive-data="archiveData"
        :is-archive-loading="isArchiveLoading"
        :archive-error="archiveError"
        :can-view-analytics="canViewAnalytics"
        :release-burndown-plot="releaseBurndownPlot"
        :release-burndown="releaseBurndown"
        :is-release-burndown-loading="isReleaseBurndownLoading"
        :release-burndown-error="releaseBurndownError"
        @create-release="createRelease"
        @add-story-to-release="addStoryToRelease"
        @remove-release="removeRelease"
        @load-archive-analytics="loadArchiveAnalytics"
        @load-release-burndown="loadReleaseBurndown"
        @remove-archived-story="removeArchivedStory"
      />

      <SettingsView
        v-else
        :settings-form="settingsForm"
        :show-settings-password="showSettingsPassword"
        :settings-error="settingsError"
        :settings-success="settingsSuccess"
        :project-settings-form="projectSettingsForm"
        :project-settings-error="projectSettingsError"
        :project-settings-success="projectSettingsSuccess"
        :user-role="userRole"
        :current-project="currentProject"
        :member-form="memberForm"
        :member-error="memberError"
        :member-success="memberSuccess"
        :is-members-loading="isMembersLoading"
        :project-members="projectMembers"
        :current-user="currentUser"
        :get-role-label="getRoleLabel"
        @toggle-settings-password="showSettingsPassword = !showSettingsPassword"
        @save-settings="saveSettings"
        @save-project-iteration-settings="saveProjectIterationSettings"
        @add-member="handleAddMember"
        @remove-member="handleRemoveMember"
      />
    </section>
  </div>
</template>

<style src="./assets/app.css"></style>



