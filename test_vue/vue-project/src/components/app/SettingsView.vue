<template>
  <div class="settings-view">
    <SettingsProfilePanel
      :settings-form="settingsForm"
      :show-settings-password="showSettingsPassword"
      :settings-error="settingsError"
      :settings-success="settingsSuccess"
      @toggle-settings-password="emit('toggleSettingsPassword')"
      @save-settings="emit('saveSettings')"
    />

    <SettingsIterationPanel
      :user-role="userRole"
      :current-project="currentProject"
      :project-settings-form="projectSettingsForm"
      :project-settings-error="projectSettingsError"
      :project-settings-success="projectSettingsSuccess"
      @save-project-iteration-settings="emit('saveProjectIterationSettings')"
    />

    <SettingsMembersPanel
      :user-role="userRole"
      :current-project="currentProject"
      :member-form="memberForm"
      :member-error="memberError"
      :member-success="memberSuccess"
      :is-members-loading="isMembersLoading"
      :project-members="projectMembers"
      :current-user="currentUser"
      :get-role-label="getRoleLabel"
      @add-member="emit('addMember')"
      @remove-member="(userId) => emit('removeMember', userId)"
    />
  </div>
</template>

<script setup>
import SettingsIterationPanel from './settings/SettingsIterationPanel.vue'
import SettingsMembersPanel from './settings/SettingsMembersPanel.vue'
import SettingsProfilePanel from './settings/SettingsProfilePanel.vue'

defineProps({
  settingsForm: {
    type: Object,
    required: true,
  },
  showSettingsPassword: {
    type: Boolean,
    default: false,
  },
  settingsError: {
    type: String,
    default: '',
  },
  settingsSuccess: {
    type: String,
    default: '',
  },
  projectSettingsForm: {
    type: Object,
    required: true,
  },
  projectSettingsError: {
    type: String,
    default: '',
  },
  projectSettingsSuccess: {
    type: String,
    default: '',
  },
  userRole: {
    type: String,
    default: 'frontend-developer',
  },
  currentProject: {
    type: [String, Number],
    default: null,
  },
  memberForm: {
    type: Object,
    required: true,
  },
  memberError: {
    type: String,
    default: '',
  },
  memberSuccess: {
    type: String,
    default: '',
  },
  isMembersLoading: {
    type: Boolean,
    default: false,
  },
  projectMembers: {
    type: Array,
    default: () => [],
  },
  currentUser: {
    type: Object,
    default: null,
  },
  getRoleLabel: {
    type: Function,
    required: true,
  },
})

const emit = defineEmits([
  'toggleSettingsPassword',
  'saveSettings',
  'saveProjectIterationSettings',
  'addMember',
  'removeMember',
])
</script>
