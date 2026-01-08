<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  registerUser,
  loginUser,
  fetchProjects,
  createProject,
  fetchProjectMembers,
  addProjectMember,
  removeProjectMember,
  fetchStories,
  createStory,
  updateStoryStatus as updateStoryStatusApi,
  updateStoryEstimate as updateStoryEstimateApi,
  addTask as addTaskApi,
  updateTaskState,
  deleteTask as deleteTaskApi,
  deleteStory as deleteStoryApi,
  completeStory as completeStoryApi,
  fetchArchiveAnalytics,
  deleteArchivedStory,
  updateUserSettings,
  updateStory,
} from './services/api'

const SESSION_KEY = 'agile-session'
const canUseStorage = typeof window !== 'undefined' && !!window?.localStorage

const readSession = () => {
  if (!canUseStorage) return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const persistSession = (session) => {
  if (!canUseStorage) return
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } else {
    window.localStorage.removeItem(SESSION_KEY)
  }
}

const statusOptions = [
  {
    value: 'backlog',
    label: 'Бэклог',
    accent: '#d97706',
    subtitle: 'Идеи и входящие',
  },
  { value: 'ready', label: 'К планированию', accent: '#0ea5e9', subtitle: 'Готовы к оценке' },
  {
    value: 'in-progress',
    label: 'В работе',
    accent: '#6366f1',
    subtitle: 'Команда выполняет задачи',
  },
  { value: 'done', label: 'Готово', accent: '#10b981', subtitle: 'Поставлено в прод' },
]

const stories = ref([])
const projects = ref([])
const currentProject = ref(null)
const currentUser = ref(readSession())
const currentPage = ref('board')
const authMode = ref('login')
const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', password: '', role: 'frontend-developer' })
const projectForm = reactive({ name: '', description: '' })
const storyForm = reactive({
  title: '',
  description: '',
  estimate: 3,
  status: 'backlog',
})
const taskDrafts = reactive({})
const isPanelCollapsed = ref(false)
const editingEstimate = ref(null)
const estimateDrafts = reactive({})
const editingStoryId = ref(null)
const storyDrafts = reactive({})
const settingsForm = reactive({
  password: '',
  role: 'frontend-developer',
})
const showLoginPassword = ref(false)
const showSettingsPassword = ref(false)

const authError = ref('')
const registerError = ref('')
const storyError = ref('')
const projectError = ref('')
const infoMessage = ref('')
const boardError = ref('')
const archiveError = ref('')
const settingsError = ref('')
const settingsSuccess = ref('')
const isBoardLoading = ref(false)
const isArchiveLoading = ref(false)
const isProjectsLoading = ref(false)
const showProjectModal = ref(false)
const projectMembers = ref([])
const isMembersLoading = ref(false)
const memberForm = reactive({ username: '' })
const memberError = ref('')
const memberSuccess = ref('')

const today = new Date()
const isoDate = (date) => date.toISOString().slice(0, 10)
const defaultArchiveTo = isoDate(today)
const defaultArchiveFrom = isoDate(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000))

const archiveFilters = reactive({
  from: defaultArchiveFrom,
  to: defaultArchiveTo,
})

const archiveData = reactive({
  summary: null,
  velocity: [],
  stories: [],
  range: null,
})

const collapsedColumns = reactive(
  statusOptions.reduce((acc, status) => {
    // по умолчанию все колонки свернуты
    acc[status.value] = true
    return acc
  }, {})
)

const userRole = computed(() => currentUser.value?.role || 'frontend-developer')

const loadProjects = async () => {
  if (!currentUser.value) return
  isProjectsLoading.value = true
  try {
    const data = await fetchProjects(currentUser.value.id)
    projects.value = data?.projects ?? []
    // Если нет текущего проекта и есть проекты, выбираем первый
    if (!currentProject.value && projects.value.length > 0) {
      currentProject.value = projects.value[0].id
    }
  } catch (error) {
    console.error('Failed to load projects:', error)
    projects.value = []
  } finally {
    isProjectsLoading.value = false
  }
}

const loadStories = async () => {
  if (!currentUser.value) return
  isBoardLoading.value = true
  boardError.value = ''
  try {
    const data = await fetchStories(currentProject.value, currentUser.value.id)
    stories.value = data?.stories ?? []
  } catch (error) {
    boardError.value = error.message || 'Не удалось загрузить данные.'
    if (error.message?.includes('access denied') || error.message?.includes('not a project member')) {
      boardError.value = 'У вас нет доступа к этому проекту.'
      stories.value = []
    }
  } finally {
    isBoardLoading.value = false
  }
}

const handleCreateProject = async () => {
  projectError.value = ''
  if (!currentUser.value) {
    projectError.value = 'Нужно авторизоваться.'
    return
  }

  const name = projectForm.name.trim()
  if (!name) {
    projectError.value = 'Введите название проекта.'
    return
  }

  try {
    const project = await createProject({
      name,
      description: projectForm.description.trim(),
      createdBy: currentUser.value.id,
    })
    projectForm.name = ''
    projectForm.description = ''
    showProjectModal.value = false
    await loadProjects()
    currentProject.value = project.id
    await loadStories()
    if (userRole.value === 'admin') {
      await loadProjectMembers()
    }
  } catch (error) {
    projectError.value = error.message || 'Не удалось создать проект.'
  }
}

const handleSelectProject = async () => {
  await loadStories()
  if (currentProject.value && userRole.value === 'admin') {
    await loadProjectMembers()
  }
}

const loadProjectMembers = async () => {
  if (!currentProject.value || !currentUser.value) return
  isMembersLoading.value = true
  memberError.value = ''
  try {
    const data = await fetchProjectMembers(currentProject.value, currentUser.value.id)
    projectMembers.value = data?.members ?? []
  } catch (error) {
    memberError.value = error.message || 'Не удалось загрузить участников.'
  } finally {
    isMembersLoading.value = false
  }
}

const handleAddMember = async () => {
  if (!currentProject.value || !currentUser.value) return
  memberError.value = ''
  memberSuccess.value = ''

  const username = memberForm.username.trim()
  if (!username) {
    memberError.value = 'Введите логин пользователя.'
    return
  }

  try {
    await addProjectMember(currentProject.value, {
      username,
      addedBy: currentUser.value.id,
    })
    memberForm.username = ''
    memberSuccess.value = 'Пользователь добавлен в проект.'
    await loadProjectMembers()
  } catch (error) {
    memberError.value = error.message || 'Не удалось добавить пользователя.'
  }
}

const handleRemoveMember = async (userId) => {
  if (!currentProject.value || !currentUser.value) return
  if (!confirm('Вы уверены, что хотите удалить этого участника из проекта?')) return

  try {
    await removeProjectMember(currentProject.value, userId, currentUser.value.id)
    memberSuccess.value = 'Участник удален из проекта.'
    await loadProjectMembers()
  } catch (error) {
    memberError.value = error.message || 'Не удалось удалить участника.'
  }
}

const getRoleLabel = (role) => {
  switch (role) {
    case 'admin':
      return 'Администратор'
    case 'team-lead':
      return 'Тим лид'
    case 'backend-developer':
      return 'Бэк разработчик'
    case 'frontend-developer':
      return 'Фронт разработчик'
    case 'designer':
      return 'Дизайнер'
    default:
      return 'Фронт разработчик'
  }
}

const loadArchiveAnalytics = async () => {
  if (!archiveFilters.from || !archiveFilters.to) return
  if (!currentUser.value) return
  archiveError.value = ''
  isArchiveLoading.value = true
  try {
    let from = archiveFilters.from
    let to = archiveFilters.to
    if (from > to) {
      archiveFilters.from = to
      archiveFilters.to = from
      from = archiveFilters.from
      to = archiveFilters.to
    }
    const data = await fetchArchiveAnalytics({
      from,
      to,
      userId: currentUser.value.id,
    })
    archiveData.summary = data.summary
    archiveData.velocity = data.velocity
    archiveData.stories = data.stories
    archiveData.range = data.range
  } catch (error) {
    console.error('Error loading archive analytics:', error)
    archiveError.value = error.message || 'Не удалось получить данные архива.'
  } finally {
    isArchiveLoading.value = false
  }
}

onMounted(async () => {
  if (currentUser.value) {
    try {
      await loadProjects()
      await loadStories()
      await loadArchiveAnalytics()
    } catch (error) {
      console.error('Error loading initial data:', error)
    }
  }
})

watch(currentUser, (value) => {
  persistSession(value)
  settingsForm.role = value?.role || 'frontend-developer'
  settingsForm.password = ''
  if (value) {
    loadProjects().then(() => {
      loadStories()
      if (value.role === 'admin' && currentProject.value) {
        loadProjectMembers()
      }
    })
  } else {
    projects.value = []
    currentProject.value = null
    stories.value = []
    projectMembers.value = []
  }
})

watch(
  () => [archiveFilters.from, archiveFilters.to],
  () => {
    loadArchiveAnalytics()
  }
)

watch(currentProject, () => {
  if (currentUser.value) {
    loadStories()
    if (userRole.value === 'admin') {
      loadProjectMembers()
    }
  }
})

watch(userRole, () => {
  if (currentUser.value && currentProject.value && userRole.value === 'admin') {
    loadProjectMembers()
  }
})

const boardColumns = computed(() =>
  statusOptions.map((status) => {
    const scopedStories = stories.value.filter((story) => story.status === status.value)
    const estimateSum = scopedStories.reduce((sum, story) => sum + Number(story.estimate ?? 0), 0)
    return {
      ...status,
      stories: scopedStories,
      estimate: estimateSum,
    }
  })
)

const analytics = computed(() => {
  const storiesCount = stories.value.length
  const storyPoints = stories.value.reduce((sum, story) => sum + Number(story.estimate ?? 0), 0)
  const tasksTotal = stories.value.reduce((sum, story) => sum + (story.tasks?.length ?? 0), 0)
  const tasksDone = stories.value.reduce(
    (sum, story) => sum + (story.tasks?.filter((task) => task.done).length ?? 0),
    0
  )
  return {
    storiesCount,
    storyPoints,
    tasksTotal,
    tasksDone,
  }
})

const userRoleLabel = computed(() => {
  return getRoleLabel(userRole.value)
})

const canDeleteStory = computed(() => {
  return ['team-lead', 'admin'].includes(userRole.value)
})

const canArchiveStory = computed(() => {
  return ['team-lead', 'admin'].includes(userRole.value)
})

const canViewAnalytics = computed(() => {
  return ['team-lead', 'admin'].includes(userRole.value)
})

const canEditStory = (story) => {
  if (!currentUser.value) return false
  if (['team-lead', 'admin'].includes(userRole.value)) return true
  return story.ownerId === currentUser.value.id
}

const resetErrors = () => {
  authError.value = ''
  registerError.value = ''
  storyError.value = ''
  infoMessage.value = ''
}

const switchMode = (mode) => {
  authMode.value = mode
  resetErrors()
}

const handleRegister = async () => {
  resetErrors()
  const username = registerForm.username.trim()
  const password = registerForm.password.trim()

  if (!username || !password) {
    registerError.value = 'Введите логин и пароль.'
    return
  }

  try {
    await registerUser({ username, password, role: registerForm.role })
    registerForm.username = ''
    registerForm.password = ''
    registerForm.role = 'frontend-developer'
    infoMessage.value = 'Аккаунт создан. Теперь можно войти.'
    authMode.value = 'login'
    loginForm.username = username
    loginForm.password = ''
  } catch (error) {
    registerError.value = error.message || 'Не удалось зарегистрироваться.'
  }
}

const handleLogin = async () => {
  resetErrors()
  const username = loginForm.username.trim()
  const password = loginForm.password.trim()

  if (!username || !password) {
    authError.value = 'Введите логин и пароль.'
    return
  }

  try {
    const user = await loginUser({ username, password })
    currentUser.value = user
    loginForm.username = ''
    loginForm.password = ''
    await loadStories()
  } catch (error) {
    authError.value = error.message || 'Неверный логин или пароль.'
  }
}

const logout = () => {
  currentUser.value = null
}

const saveSettings = async () => {
  settingsError.value = ''
  settingsSuccess.value = ''

  if (!currentUser.value) {
    settingsError.value = 'Нужно авторизоваться.'
    return
  }

  const payload = {
    userId: currentUser.value.id,
    role: settingsForm.role,
  }

  const trimmedPassword = settingsForm.password.trim()
  if (trimmedPassword) {
    if (trimmedPassword.length < 6) {
      settingsError.value = 'Пароль должен быть не короче 6 символов.'
      return
    }
    payload.password = trimmedPassword
  }

  try {
    const updated = await updateUserSettings(currentUser.value.id, payload)
    currentUser.value = { ...currentUser.value, role: updated.role || currentUser.value.role }
    settingsForm.password = ''
    settingsSuccess.value = 'Настройки сохранены.'
  } catch (error) {
    settingsError.value = error.message || 'Не удалось сохранить настройки.'
  }
}

const addStory = async () => {
  resetErrors()
  if (!currentUser.value) {
    storyError.value = 'Нужно авторизоваться.'
    return
  }

  const title = storyForm.title.trim()
  const description = storyForm.description.trim()
  const estimate = Number(storyForm.estimate)

  if (!title) {
    storyError.value = 'Заполните название истории.'
    return
  }

  try {
    await createStory({
      title,
      description,
      estimate: Number.isFinite(estimate) && estimate > 0 ? estimate : 1,
      status: storyForm.status,
      ownerId: currentUser.value.id,
      projectId: currentProject.value,
    })
    storyForm.title = ''
    storyForm.description = ''
    storyForm.estimate = 3
    storyForm.status = 'backlog'
    await loadStories()
  } catch (error) {
    storyError.value = error.message || 'Не удалось добавить историю.'
  }
}

const updateStoryStatus = async (storyId, status) => {
  if (!currentUser.value) return
  try {
    await updateStoryStatusApi(storyId, status, currentUser.value.id)
    await loadStories()
  } catch (error) {
    boardError.value = error.message || 'Не удалось обновить статус.'
  }
}

const startEditingEstimate = (storyId, currentEstimate) => {
  editingEstimate.value = storyId
  estimateDrafts[storyId] = currentEstimate
}

const cancelEditingEstimate = (storyId) => {
  editingEstimate.value = null
  delete estimateDrafts[storyId]
}

const startEditingStory = (story) => {
  editingStoryId.value = story.id
  storyDrafts[story.id] = {
    title: story.title,
    description: story.description,
  }
}

const cancelEditingStory = (storyId) => {
  if (editingStoryId.value === storyId) {
    editingStoryId.value = null
  }
  delete storyDrafts[storyId]
}

const saveStory = async (storyId) => {
  if (!currentUser.value) return
  const draft = storyDrafts[storyId]
  if (!draft) return

  const title = draft.title?.trim()
  const description = draft.description?.trim() ?? ''

  if (!title) {
    boardError.value = 'Заполните название истории.'
    return
  }

  try {
    await updateStory(storyId, {
      title,
      description,
      userId: currentUser.value.id,
    })
    editingStoryId.value = null
    delete storyDrafts[storyId]
    await loadStories()
  } catch (error) {
    boardError.value = error.message || 'Не удалось сохранить историю.'
  }
}

const saveEstimate = async (storyId) => {
  if (!currentUser.value) return
  const newEstimate = Number(estimateDrafts[storyId])
  if (!Number.isFinite(newEstimate) || newEstimate < 1) {
    boardError.value = 'Оценка должна быть числом от 1 и выше.'
    return
  }

  try {
    await updateStoryEstimateApi(storyId, newEstimate, currentUser.value.id)
    editingEstimate.value = null
    delete estimateDrafts[storyId]
    await loadStories()
  } catch (error) {
    boardError.value = error.message || 'Не удалось обновить оценку.'
  }
}

const addTaskToStory = async (storyId) => {
  const draft = (taskDrafts[storyId] ?? '').trim()
  if (!draft) return

  try {
    await addTaskApi(storyId, draft)
    taskDrafts[storyId] = ''
    await loadStories()
  } catch (error) {
    storyError.value = error.message || 'Не удалось добавить задачу.'
  }
}

const toggleTask = async (storyId, taskId) => {
  const story = stories.value.find((item) => item.id === storyId)
  const task = story?.tasks.find((item) => item.id === taskId)
  if (!task) return

  try {
    await updateTaskState(storyId, taskId, !task.done)
    await loadStories()
  } catch (error) {
    storyError.value = error.message || 'Не удалось обновить задачу.'
  }
}

const removeTask = async (storyId, taskId) => {
  try {
    await deleteTaskApi(storyId, taskId)
    await loadStories()
  } catch (error) {
    storyError.value = error.message || 'Не удалось удалить задачу.'
  }
}

const removeStory = async (storyId) => {
  if (!currentUser.value) return
  try {
    await deleteStoryApi(storyId, currentUser.value.id)
    await loadStories()
  } catch (error) {
    boardError.value = error.message || 'Не удалось удалить историю.'
  }
}

const archiveStory = async (storyId) => {
  if (!currentUser.value) return
  try {
    await completeStoryApi(storyId, currentUser.value.id)
    await loadStories()
    await loadArchiveAnalytics()
    infoMessage.value = 'История отправлена в архив.'
  } catch (error) {
    boardError.value = error.message || 'Не удалось перенести историю в архив.'
  }
}

const removeArchivedStory = async (archivedId) => {
  try {
    await deleteArchivedStory(archivedId)
    await loadArchiveAnalytics()
  } catch (error) {
    archiveError.value = error.message || 'Не удалось удалить архивацию.'
  }
}

const toggleColumn = (columnValue) => {
  collapsedColumns[columnValue] = !collapsedColumns[columnValue]
}
</script>

<template>
  <div class="shell">
    <header class="hero">
      <div>
        <p class="eyebrow">Agile Workspace</p>
        <h1>Мини-приложение для планирования спринтов</h1>
        <p class="lede">
          Регистрируйтесь, оценивайте пользовательские истории, ведите задачи и отслеживайте
          прогресс с одного экрана.
        </p>
      </div>
      <div v-if="currentUser" class="user-chip">
        <div class="user-chip-info">
          <span class="user-chip-name">{{ currentUser.username }}</span>
          <span class="user-chip-role">{{ userRoleLabel }}</span>
        </div>
        <button class="ghost" @click="logout">Выйти</button>
      </div>
    </header>

    <section v-if="!currentUser" class="auth-section">
      <div class="auth-card">
        <div class="auth-tabs">
          <button
            class="tab"
            :class="{ active: authMode === 'login' }"
            type="button"
            @click="switchMode('login')"
          >
            Вход
          </button>
          <button
            class="tab"
            :class="{ active: authMode === 'register' }"
            type="button"
            @click="switchMode('register')"
          >
            Регистрация
          </button>
        </div>

        <form v-if="authMode === 'login'" class="auth-form" @submit.prevent="handleLogin">
          <label>
            Логин
            <input v-model="loginForm.username" placeholder="scrum.master" />
          </label>
          <label>
            Пароль
            <div class="password-field">
              <input
                v-model="loginForm.password"
                :type="showLoginPassword ? 'text' : 'password'"
                placeholder="••••••"
              />
              <button
                type="button"
                class="eye-btn"
                :aria-label="showLoginPassword ? 'Скрыть пароль' : 'Показать пароль'"
                @click="showLoginPassword = !showLoginPassword"
              >
                {{ showLoginPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </label>
          <button class="primary" type="submit">Войти</button>
          <p v-if="authError" class="error">{{ authError }}</p>
          <p v-if="infoMessage" class="info">{{ infoMessage }}</p>
        </form>

        <form v-else class="auth-form" @submit.prevent="handleRegister">
          <label>
            Логин
            <input v-model="registerForm.username" placeholder="product.owner" />
          </label>
          <label>
            Пароль
            <input v-model="registerForm.password" type="password" placeholder="минимум 6 символов" />
          </label>
            <label>
              Роль
              <select v-model="registerForm.role">
                <option value="admin">Администратор</option>
                <option value="team-lead">Тим лид</option>
                <option value="backend-developer">Бэк разработчик</option>
                <option value="frontend-developer">Фронт разработчик</option>
                <option value="designer">Дизайнер</option>
              </select>
            </label>
          <button class="primary" type="submit">Создать аккаунт</button>
          <p v-if="registerError" class="error">{{ registerError }}</p>
        </form>
      </div>
    </section>

    <section v-else>
      <div class="project-selector">
        <div class="project-selector-content">
          <label class="project-label">
            Проект:
            <select v-model="currentProject" @change="handleSelectProject" class="project-select">
              <option :value="null">Без проекта</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </label>
          <button class="primary small" type="button" @click="showProjectModal = true">
            + Создать проект
          </button>
        </div>
      </div>

      <div v-if="showProjectModal" class="modal-overlay" @click="showProjectModal = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>Создать новый проект</h2>
            <button class="modal-close" type="button" @click="showProjectModal = false">×</button>
          </div>
          <form class="project-form" @submit.prevent="handleCreateProject">
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
              <button class="ghost-btn" type="button" @click="showProjectModal = false">Отмена</button>
            </div>
            <p v-if="projectError" class="error">{{ projectError }}</p>
          </form>
        </div>
      </div>

      <div class="page-switch">
        <button
          class="tab"
          :class="{ active: currentPage === 'board' }"
          type="button"
          @click="currentPage = 'board'"
        >
          Бэклог и спринт
        </button>
        <button
          v-if="canViewAnalytics"
          class="tab"
          :class="{ active: currentPage === 'archive' }"
          type="button"
          @click="currentPage = 'archive'"
        >
          Аналитика архива
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

      <div v-if="currentPage === 'board'" class="workspace">
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
                @click="isPanelCollapsed = !isPanelCollapsed"
                :aria-label="isPanelCollapsed ? 'Развернуть' : 'Свернуть'"
              >
                {{ isPanelCollapsed ? '▼' : '▲' }}
              </button>
            </div>
            <form v-show="!isPanelCollapsed" class="story-form" @submit.prevent="addStory">
              <label>
                Название
                <input v-model="storyForm.title" placeholder="Как пользователь, я хочу..." />
              </label>
              <label>
                Описание <span class="optional">(необязательно)</span>
                <textarea
                  v-model="storyForm.description"
                  rows="4"
                  placeholder="Кратко опишите ценность и критерии (необязательно)"
                />
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
                  <button class="collapse-btn" type="button" @click="toggleColumn(column.value)">
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
                        <textarea
                          v-model="storyDrafts[story.id].description"
                          class="story-edit-textarea"
                          rows="3"
                          placeholder="Описание"
                        />
                      </template>
                      <template v-else>
                        <p class="story-title">{{ story.title }}</p>
                        <p class="story-owner">Автор: {{ story.owner }}</p>
                      </template>
                    </div>
                    <select
                      :value="story.status"
                      @change="updateStoryStatus(story.id, $event.target.value)"
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
                  <p v-if="editingStoryId !== story.id" class="story-description">{{ story.description }}</p>
                  <div class="story-meta">
                    <span
                      v-if="editingEstimate !== story.id"
                      class="tag editable"
                      @click="startEditingEstimate(story.id, story.estimate)"
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
                        @keyup.enter="saveEstimate(story.id)"
                        @keyup.esc="cancelEditingEstimate(story.id)"
                        @blur="saveEstimate(story.id)"
                        autofocus
                      />
                      <span class="estimate-label">SP</span>
                      <button
                        class="estimate-save"
                        type="button"
                        @click="saveEstimate(story.id)"
                        title="Сохранить"
                      >
                        ✓
                      </button>
                      <button
                        class="estimate-cancel"
                        type="button"
                        @click="cancelEditingEstimate(story.id)"
                        title="Отмена"
                      >
                        ✕
                      </button>
                    </div>
                    <span class="tag secondary">
                      Задач: {{ story.tasks.length }} · Завершено:
                      {{ story.tasks.filter((task) => task.done).length }}
                    </span>
                  </div>
                  <div v-if="canArchiveStory || canDeleteStory" class="story-actions">
                    <button
                      v-if="canArchiveStory"
                      class="ghost-btn"
                      type="button"
                      :disabled="story.status !== 'done'"
                      @click="archiveStory(story.id)"
                    >
                      В архив
                    </button>
                    <button
                      v-if="canDeleteStory"
                      class="ghost-btn danger"
                      type="button"
                      @click="removeStory(story.id)"
                    >
                      Удалить
                    </button>
                    <button
                      v-if="editingStoryId !== story.id && canEditStory(story)"
                      class="ghost-btn"
                      type="button"
                      @click="startEditingStory(story)"
                    >
                      Редактировать
                    </button>
                    <template v-else-if="editingStoryId === story.id">
                      <button class="ghost-btn" type="button" @click="saveStory(story.id)">
                        Сохранить
                      </button>
                      <button class="ghost-btn" type="button" @click="cancelEditingStory(story.id)">
                        Отмена
                      </button>
                    </template>
                  </div>

                  <ul class="tasks">
                    <li v-for="task in story.tasks" :key="task.id">
                      <label>
                        <input
                          :checked="task.done"
                          type="checkbox"
                          @change="toggleTask(story.id, task.id)"
                        />
                        <span :class="{ done: task.done }">{{ task.title }}</span>
                      </label>
                      <button
                        class="task-remove"
                        type="button"
                        @click="removeTask(story.id, task.id)"
                      >
                        ✕
                      </button>
                    </li>
                  </ul>

                  <div class="task-adder">
                    <input
                      v-model="taskDrafts[story.id]"
                      placeholder="Новая задача"
                      @keyup.enter.prevent="addTaskToStory(story.id)"
                    />
                    <button type="button" @click="addTaskToStory(story.id)">Добавить</button>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="currentPage === 'archive'" class="archive-view">
        <div class="panel archive-panel">
          <h2>Аналитика архива</h2>
          <div class="filters">
            <label>
              С даты
              <input v-model="archiveFilters.from" type="date" />
            </label>
            <label>
              По дату
              <input v-model="archiveFilters.to" type="date" />
            </label>
            <button class="ghost-btn" type="button" @click="loadArchiveAnalytics">Обновить</button>
          </div>
          <p class="muted" v-if="archiveData.range">
            Период: {{ new Date(archiveData.range.from).toLocaleDateString('ru-RU') }} —
            {{ new Date(archiveData.range.to).toLocaleDateString('ru-RU') }}
          </p>
        </div>

        <div class="stats archive-stats">
          <div>
            <p class="eyebrow">Архивировано историй</p>
            <strong>{{ archiveData.summary?.totalStories ?? 0 }}</strong>
          </div>
          <div>
            <p class="eyebrow">Story Points</p>
            <strong>{{ archiveData.summary?.totalPoints ?? 0 }}</strong>
          </div>
          <div>
            <p class="eyebrow">Задачи</p>
            <strong>{{ archiveData.summary?.doneTasks ?? 0 }} / {{ archiveData.summary?.totalTasks ?? 0 }}</strong>
          </div>
          <div>
            <p class="eyebrow">Активных владельцев</p>
            <strong>{{ archiveData.summary?.ownerCount ?? 0 }}</strong>
          </div>
        </div>

        <p v-if="isArchiveLoading" class="muted">Строим отчеты...</p>
        <p v-if="archiveError" class="error">{{ archiveError }}</p>

        <div class="velocity">
          <h3>Динамика закрытия</h3>
          <div v-if="!archiveData.velocity.length" class="empty">Нет данных за выбранный период</div>
          <div v-else class="velocity-grid">
            <div v-for="bucket in archiveData.velocity" :key="bucket.date" class="velocity-card">
              <p class="label">{{ new Date(bucket.date).toLocaleDateString('ru-RU') }}</p>
              <p class="value">{{ bucket.stories }}</p>
              <p class="muted">{{ bucket.points }} SP</p>
            </div>
          </div>
        </div>

        <div class="archive-list">
          <h3>Последние истории</h3>
          <p v-if="!archiveData.stories.length" class="empty">Архив пуст за этот период.</p>
          <article v-for="item in archiveData.stories" :key="item.id" class="story-card">
            <div class="story-header">
              <div>
                <p class="story-title">{{ item.title }}</p>
                <p class="story-owner">
                  Автор: {{ item.ownerName ?? 'не указан' }} · Закрыто:
                  {{ new Date(item.completedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) }}
                </p>
              </div>
              <div class="archive-actions">
                <span class="tag">{{ item.estimate }} SP</span>
                <button class="ghost-btn danger" type="button" @click="removeArchivedStory(item.id)">
                  Удалить
                </button>
              </div>
            </div>
            <p class="story-description">{{ item.description }}</p>
            <ul class="tasks">
              <li v-for="task in item.tasks" :key="task.id ?? task.title">
                <label>
                  <input :checked="task.done" disabled type="checkbox" />
                  <span :class="{ done: task.done }">{{ task.title }}</span>
                </label>
              </li>
            </ul>
          </article>
        </div>
      </div>

      <div v-else class="settings-view">
        <div class="panel settings-panel">
          <h2>Настройки профиля</h2>
          <div class="settings-form">
            <label>
              Новый пароль
              <div class="password-field">
                <input
                  v-model="settingsForm.password"
                  :type="showSettingsPassword ? 'text' : 'password'"
                  placeholder="минимум 6 символов"
                />
                <button
                  type="button"
                  class="eye-btn"
                  :aria-label="showSettingsPassword ? 'Скрыть пароль' : 'Показать пароль'"
                  @click="showSettingsPassword = !showSettingsPassword"
                >
                  {{ showSettingsPassword ? '🙈' : '👁️' }}
                </button>
              </div>
              <span class="optional">Оставьте пустым, если не нужно менять пароль</span>
            </label>
            <label>
              Роль
              <select v-model="settingsForm.role">
                <option value="admin">Администратор</option>
                <option value="team-lead">Тим лид</option>
                <option value="backend-developer">Бэк разработчик</option>
                <option value="frontend-developer">Фронт разработчик</option>
                <option value="designer">Дизайнер</option>
              </select>
            </label>
            <button class="primary" type="button" @click="saveSettings">Сохранить</button>
            <p v-if="settingsError" class="error">{{ settingsError }}</p>
            <p v-if="settingsSuccess" class="info">{{ settingsSuccess }}</p>
          </div>
        </div>

        <div v-if="userRole === 'admin' && currentProject" class="panel settings-panel">
          <h2>Участники проекта</h2>
          <p v-if="!currentProject" class="muted">Выберите проект для управления участниками</p>
          <div v-else>
            <div class="member-form">
              <label>
                Добавить участника по логину
                <div class="member-input-group">
                  <input
                    v-model="memberForm.username"
                    placeholder="Введите логин пользователя"
                    @keyup.enter.prevent="handleAddMember"
                  />
                  <button class="primary small" type="button" @click="handleAddMember">
                    Добавить
                  </button>
                </div>
              </label>
              <p v-if="memberError" class="error">{{ memberError }}</p>
              <p v-if="memberSuccess" class="info">{{ memberSuccess }}</p>
            </div>

            <div class="members-list">
              <h3>Список участников</h3>
              <p v-if="isMembersLoading" class="muted">Загрузка...</p>
              <p v-else-if="!projectMembers.length" class="muted">Нет участников в проекте</p>
              <div v-else class="members-grid">
                <div v-for="member in projectMembers" :key="member.id" class="member-card">
                  <div class="member-info">
                    <div class="member-header">
                      <span class="member-username">{{ member.username }}</span>
                      <span class="member-role-badge" :class="`role-${member.role}`">
                        {{ getRoleLabel(member.role) }}
                      </span>
                    </div>
                    <p class="member-meta">
                      Добавлен: {{ new Date(member.addedAt).toLocaleDateString('ru-RU') }}
                      <span v-if="member.addedByUsername"> · {{ member.addedByUsername }}</span>
                    </p>
                  </div>
                  <button
                    v-if="currentUser && member.userId !== currentUser.id"
                    class="ghost-btn danger small"
                    type="button"
                    @click="handleRemoveMember(member.userId)"
                    title="Удалить из проекта"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 20px 80px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.hero {
  display: flex;
  gap: 24px;
  justify-content: space-between;
  align-items: flex-start;
}

.eyebrow {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6366f1;
  margin-bottom: 4px;
}

.lede {
  color: #475467;
  max-width: 640px;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border: 1px solid #e4e7ec;
  border-radius: 999px;
  background: #fff;
}

.user-chip-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.user-chip-name {
  font-weight: 600;
}

.user-chip-role {
  font-size: 0.8rem;
  color: #6366f1;
  font-weight: 500;
}

.ghost {
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
}

.auth-section {
  display: flex;
  justify-content: center;
}

.auth-card {
  width: min(400px, 100%);
  background: #fff;
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
}

.auth-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.project-selector {
  background: #fff;
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
}

.project-selector-content {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.project-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #475467;
  margin: 0;
}

.project-select {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #d0d5dd;
  font: inherit;
  background: #fff;
  min-width: 200px;
  cursor: pointer;
}

.primary.small {
  padding: 8px 16px;
  font-size: 0.9rem;
  width: auto;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: #fff;
  border-radius: 20px;
  padding: 0;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0;
  margin-bottom: 20px;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.modal-close {
  border: none;
  background: transparent;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  color: #64748b;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.modal-close:hover {
  background: #f1f5f9;
}

.project-form {
  padding: 0 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-actions .primary {
  width: auto;
}

.page-switch {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.tab {
  border: 1px solid #e4e7ec;
  border-radius: 999px;
  padding: 10px 0;
  background: #f8fafc;
  cursor: pointer;
  font-weight: 600;
}

.tab.active {
  background: #6366f1;
  color: #fff;
  border-color: #6366f1;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
  color: #475467;
}

.optional {
  font-size: 0.8rem;
  color: #94a3b8;
  font-weight: normal;
}

input,
textarea,
select {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #d0d5dd;
  font: inherit;
  background: #fff;
}

textarea {
  resize: vertical;
}

.primary {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: #22c55e;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.error {
  color: #dc2626;
  font-size: 0.88rem;
}

.info {
  color: #0ea5e9;
  font-size: 0.88rem;
}

.workspace {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.archive-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-panel h2 {
  margin-top: 0;
}

.settings-panel h3 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-size: 1.1rem;
}

.member-form {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.member-input-group {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.member-input-group input {
  flex: 1;
}

.members-list {
  margin-top: 16px;
}

.members-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.member-info {
  flex: 1;
}

.member-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.member-username {
  font-weight: 600;
  color: #0f172a;
  font-size: 1rem;
}

.member-role-badge {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.member-role-badge.role-admin {
  background: #fee2e2;
  color: #991b1b;
}

.member-role-badge.role-team-lead {
  background: #dbeafe;
  color: #1e40af;
}

.member-role-badge.role-backend-developer {
  background: #e0e7ff;
  color: #3730a3;
}

.member-role-badge.role-frontend-developer {
  background: #f1f5f9;
  color: #475467;
}

.member-role-badge.role-designer {
  background: #fef3c7;
  color: #92400e;
}

.member-meta {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0;
}

.ghost-btn.small {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.password-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.password-field input {
  flex: 1;
}

.eye-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 0.95rem;
}

.archive-panel .filters {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin: 16px 0;
}

.archive-panel .filters label {
  flex: 1 1 140px;
}

.archive-stats {
  background: #020617;
}

.velocity {
  background: #fff;
  padding: 24px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
}

.velocity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.velocity-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 12px;
  text-align: center;
}

.velocity-card .value {
  font-size: 1.8rem;
  margin: 4px 0;
}

.archive-list .story-card {
  margin-bottom: 16px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  background: #0f172a;
  color: #fff;
  border-radius: 20px;
  padding: 20px 24px;
}

.stats strong {
  font-size: 2rem;
}

.grid {
  display: grid;
  gap: 24px;
  grid-template-columns: 320px 1fr;
}

.panel {
  background: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  align-self: start;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h2 {
  margin: 0;
  flex: 1;
}

.collapse-btn {
  border: none;
  background: transparent;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 8px;
  color: #6366f1;
  line-height: 1;
  transition: transform 0.2s ease;
}

.story-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.inline {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.board {
  display: grid;
  gap: 16px;
}

.column {
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 20px;
  background: #f8fafc;
}

.column-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.column-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-weight: 600;
}

.muted {
  color: #475467;
  font-size: 0.85rem;
}

.badge {
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.08);
}

.collapse-btn {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 6px 12px;
  background: #fff;
  cursor: pointer;
  font-size: 0.85rem;
  color: #475467;
}

.empty {
  text-align: center;
  color: #94a3b8;
  padding: 24px;
}

.empty.collapsed {
  font-style: italic;
  padding: 12px;
}

.story-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.column article:last-child {
  margin-bottom: 0;
}

.story-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.story-header select {
  width: 140px;
  min-width: 140px;
  max-width: 140px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid #cbd5f5;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.story-title {
  font-weight: 600;
  margin: 0;
}

.story-owner {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0;
}

.story-description {
  color: #475467;
  margin: 0;
}

.story-edit-input,
.story-edit-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid #cbd5f5;
  font: inherit;
  margin-bottom: 8px;
}

.story-edit-textarea {
  resize: vertical;
}

.story-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.tag.editable {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.tag.editable:hover {
  background: #e2e8f0;
}

.estimate-editor {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  border: 1px solid #cbd5f5;
}

.estimate-input {
  width: 50px;
  padding: 2px 6px;
  border: 1px solid #cbd5f5;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
}

.estimate-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475467;
}

.estimate-save,
.estimate-cancel {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 0.9rem;
  line-height: 1;
  color: #6366f1;
  transition: color 0.2s ease;
}

.estimate-save:hover {
  color: #22c55e;
}

.estimate-cancel:hover {
  color: #ef4444;
}

.story-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ghost-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475467;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 0.85rem;
  cursor: pointer;
}

.ghost-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ghost-btn.danger {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.4);
}

.tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  font-size: 0.85rem;
  font-weight: 600;
}

.tag.secondary {
  background: #eef2ff;
  color: #4c1d95;
}

.tasks {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tasks li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
}

.tasks label {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.tasks input {
  width: auto;
}

.tasks .done {
  text-decoration: line-through;
  color: #94a3b8;
}

.task-remove {
  border: none;
  background: transparent;
  color: #c2410c;
  cursor: pointer;
  font-size: 0.9rem;
}

.archive-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-adder {
  display: flex;
  gap: 8px;
}

.task-adder button {
  border: none;
  background: #3b82f6;
  color: #fff;
  border-radius: 10px;
  padding: 0 16px;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 960px) {
  .workspace {
    position: relative;
    overflow-x: hidden;
  }

  .grid {
    grid-template-columns: 1fr;
    position: relative;
  }

  .panel {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: #fff;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.15);
    margin: 0;
    border-radius: 0 0 20px 20px;
    padding: 8px 12px;
    max-height: auto;
    overflow: visible;
  }

  .panel.collapsed {
    max-height: 50px;
    overflow: hidden;
  }

  .panel-header {
    margin-bottom: 8px;
  }

  .panel-header h2 {
    font-size: 1rem;
  }

  .story-form {
    gap: 10px;
  }

  .story-form label {
    font-size: 0.8rem;
    gap: 4px;
  }

  .story-form input,
  .story-form textarea,
  .story-form select {
    padding: 6px 8px;
    font-size: 0.85rem;
  }

  .story-form textarea {
    min-height: 60px;
    max-height: 100px;
  }

  .story-form .inline {
    gap: 10px;
  }

  .grid > .board {
    margin-top: 0;
    padding-top: 60px;
    min-height: 100vh;
    transition: padding-top 0.3s ease;
  }

  .grid > .board.panel-expanded {
    padding-top: 280px;
  }
}

@media (max-width: 640px) {
  .hero {
    flex-direction: column;
  }

  .shell {
    padding: 24px 16px 60px;
  }

  .inline {
    grid-template-columns: 1fr;
  }

  .tasks label {
    align-items: flex-start;
  }
}
</style>
