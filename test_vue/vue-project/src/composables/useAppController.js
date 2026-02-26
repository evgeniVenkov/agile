import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  registerUser,
  loginUser,
  fetchProjects,
  createProject,
  updateProject as updateProjectApi,
  fetchReleases as fetchReleasesApi,
  createRelease as createReleaseApi,
  addStoryToRelease as addStoryToReleaseApi,
  deleteRelease as deleteReleaseApi,
  fetchProjectMembers,
  addProjectMember,
  removeProjectMember,
  fetchStories,
  createStory,
  updateStoryStatus as updateStoryStatusApi,
  updateStoryEstimate as updateStoryEstimateApi,
  addTask as addTaskApi,
  updateTaskState,
  assignTask,
  updateTaskTitle as updateTaskTitleApi,
  deleteTask as deleteTaskApi,
  deleteStory as deleteStoryApi,
  completeStory as completeStoryApi,
  fetchArchiveAnalytics,
  fetchReleaseBurndown,
  deleteArchivedStory,
  updateUserSettings,
  updateStory,
} from '../services/api'

export const useAppController = () => {
  
  const SESSION_KEY = 'agile-session'
  const DAY_MS = 24 * 60 * 60 * 1000
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
  const projectNameDraft = ref('')
  const isEditingProjectName = ref(false)
  const releases = ref([])
  const releaseForm = reactive({ name: '', date: '' })
  const releaseError = ref('')
  const releaseBurndownError = ref('')
  const releaseStoryDrafts = reactive({})
  const storyForm = reactive({
    title: '',
    estimate: 3,
    status: 'backlog',
  })
  const taskDrafts = reactive({})
  const collapsedTasks = reactive({})
  const editingEstimate = ref(null)
  const estimateDrafts = reactive({})
  const editingStoryId = ref(null)
  const storyDrafts = reactive({})
  const settingsForm = reactive({
    password: '',
    role: 'frontend-developer',
  })
  const projectSettingsForm = reactive({
    iterationDays: 14,
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
  const projectSettingsError = ref('')
  const projectSettingsSuccess = ref('')
  const isBoardLoading = ref(false)
  const isArchiveLoading = ref(false)
  const isReleaseBurndownLoading = ref(false)
  const isProjectsLoading = ref(false)
  const showProjectModal = ref(false)
  const projectMembers = ref([])
  const isMembersLoading = ref(false)
  const memberForm = reactive({ username: '' })
  const memberError = ref('')
  const memberSuccess = ref('')
  
  const availableMembersForAssignment = computed(() => {
    if (!projectMembers.value || !Array.isArray(projectMembers.value)) return []
    return projectMembers.value.filter(
      (m) => m && m.userId && m.userId !== currentUser.value?.id
    )
  })
  
  const currentProjectInfo = computed(
    () => projects.value.find((project) => project.id === currentProject.value) ?? null
  )
  
  const today = new Date()
  const isoDate = (date) => date.toISOString().slice(0, 10)
  const defaultArchiveTo = isoDate(today)
  const defaultArchiveFrom = isoDate(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000))
  releaseForm.date = defaultArchiveTo
  
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
  
  const releaseBurndown = reactive({
    release: null,
    range: null,
    totalPoints: 0,
    totalStories: 0,
    series: [],
  })
  
  const selectedReleaseId = ref(null)
  
  const collapsedColumns = reactive(
    statusOptions.reduce((acc, status) => {
      // по умолчанию все колонки свернуты
      acc[status.value] = true
      return acc
    }, {})
  )
  
  const userRole = computed(() => currentUser.value?.role || 'frontend-developer')
  const currentIterationInfo = computed(() => {
    const createdAt = currentProjectInfo.value?.createdAt
    const rawIterationDays = Number.parseInt(currentProjectInfo.value?.iterationDays, 10)
    const iterationDays =
      Number.isFinite(rawIterationDays) && rawIterationDays >= 1 ? rawIterationDays : 14
    if (!createdAt) return null
  
    const createdDate = new Date(createdAt)
    if (Number.isNaN(createdDate.getTime())) return null
  
    const createdUtc = Date.UTC(
      createdDate.getUTCFullYear(),
      createdDate.getUTCMonth(),
      createdDate.getUTCDate()
    )
    const now = new Date()
    const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    const normalizedNowUtc = Math.max(nowUtc, createdUtc)
    const elapsedDays = Math.floor((normalizedNowUtc - createdUtc) / DAY_MS) + 1
    const iterationNumber = Math.max(1, Math.ceil(elapsedDays / iterationDays))
    const iterationStartUtc = createdUtc + (iterationNumber - 1) * iterationDays * DAY_MS
    const iterationEndUtc = iterationStartUtc + (iterationDays - 1) * DAY_MS
  
    return {
      number: iterationNumber,
      iterationDays,
      startDate: new Date(iterationStartUtc).toISOString(),
      endDate: new Date(iterationEndUtc).toISOString(),
    }
  })
  
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
    cancelEditingProjectName()
    await loadStories()
    if (currentProject.value && userRole.value === 'admin') {
      await loadProjectMembers()
    }
    if (currentProject.value && userRole.value === 'admin' && currentPage.value === 'archive') {
      await loadReleases()
    }
  }
  
  const loadReleases = async () => {
    releaseError.value = ''
    if (!currentUser.value || !currentProject.value || userRole.value !== 'admin') {
      releases.value = []
      return
    }
  
    try {
      const data = await fetchReleasesApi(currentProject.value, currentUser.value.id)
      releases.value = data?.releases ?? []
      if (releases.value.length) {
        const selectedStillExists = releases.value.some(
          (release) => Number(release.id) === Number(selectedReleaseId.value)
        )
        if (!selectedStillExists) {
          selectedReleaseId.value = releases.value[0].id
        }
      } else {
        selectedReleaseId.value = null
        releaseBurndown.release = null
        releaseBurndown.range = null
        releaseBurndown.totalPoints = 0
        releaseBurndown.totalStories = 0
        releaseBurndown.series = []
      }
    } catch (error) {
      releaseError.value = error.message || 'Не удалось загрузить релизы.'
      releases.value = []
    }
  }
  
  const createRelease = async () => {
    releaseError.value = ''
    if (!currentUser.value || !currentProject.value) return
  
    const name = releaseForm.name.trim()
    const date = releaseForm.date
  
    if (!name) {
      releaseError.value = 'Введите название релиза.'
      return
    }
    if (!date) {
      releaseError.value = 'Выберите дату релиза.'
      return
    }
  
    try {
      await createReleaseApi({
        projectId: currentProject.value,
        userId: currentUser.value.id,
        name,
        releaseDate: date,
      })
      releaseForm.name = ''
      releaseForm.date = defaultArchiveTo
      await loadReleases()
    } catch (error) {
      releaseError.value = error.message || 'Не удалось создать релиз.'
    }
  }
  
  const addStoryToRelease = async (releaseId) => {
    if (!currentUser.value) return
    const storyId = releaseStoryDrafts[releaseId]
    if (!storyId) return
  
    try {
      await addStoryToReleaseApi(releaseId, storyId, currentUser.value.id)
      releaseStoryDrafts[releaseId] = null
      await loadStories()
    } catch (error) {
      releaseError.value = error.message || 'Не удалось добавить историю в релиз.'
    }
  }
  
  const removeRelease = async (releaseId) => {
    if (!currentUser.value) return
    if (!confirm('Удалить релиз? Истории останутся, релиз будет удален.')) return
  
    try {
      await deleteReleaseApi(releaseId, currentUser.value.id)
      if (Number(selectedReleaseId.value) === Number(releaseId)) {
        selectedReleaseId.value = null
      }
      await loadReleases()
      await loadStories()
    } catch (error) {
      releaseError.value = error.message || 'Не удалось удалить релиз.'
    }
  }
  
  const startEditingProjectName = () => {
    const project = projects.value.find((p) => p.id === currentProject.value)
    if (!project) return
    projectNameDraft.value = project.name
    isEditingProjectName.value = true
  }
  
  const cancelEditingProjectName = () => {
    isEditingProjectName.value = false
    projectNameDraft.value = ''
  }
  
  const saveProjectName = async () => {
    if (!currentUser.value || !currentProject.value) return
    const name = projectNameDraft.value.trim()
    if (!name) {
      projectError.value = 'Введите название проекта.'
      return
    }
  
    try {
      await updateProjectApi(currentProject.value, { name, userId: currentUser.value.id })
      isEditingProjectName.value = false
      projectNameDraft.value = ''
      await loadProjects()
    } catch (error) {
      projectError.value = error.message || 'Не удалось обновить название проекта.'
    }
  }
  
  const saveProjectIterationSettings = async () => {
    projectSettingsError.value = ''
    projectSettingsSuccess.value = ''
  
    if (!currentUser.value || !currentProject.value) {
      projectSettingsError.value = 'Выберите проект и авторизуйтесь.'
      return
    }
  
    const normalizedIterationDays = Number.parseInt(projectSettingsForm.iterationDays, 10)
    if (!Number.isFinite(normalizedIterationDays) || normalizedIterationDays < 1) {
      projectSettingsError.value = 'Длительность итерации должна быть целым числом больше 0.'
      return
    }
  
    try {
      await updateProjectApi(currentProject.value, {
        userId: currentUser.value.id,
        iterationDays: normalizedIterationDays,
      })
      await loadProjects()
      projectSettingsSuccess.value = 'Настройки итерации сохранены.'
    } catch (error) {
      projectSettingsError.value = error.message || 'Не удалось сохранить настройки итерации.'
    }
  }
  
  const loadProjectMembers = async () => {
    if (!currentProject.value || !currentUser.value) {
      projectMembers.value = []
      return
    }
    isMembersLoading.value = true
    memberError.value = ''
    try {
      const data = await fetchProjectMembers(currentProject.value, currentUser.value.id)
      projectMembers.value = Array.isArray(data?.members) ? data.members : []
    } catch (error) {
      // Если ошибка доступа, просто не загружаем участников
      if (error.message?.includes('access denied') || error.message?.includes('not a project member')) {
        projectMembers.value = []
      } else {
        memberError.value = error.message || 'Не удалось загрузить участников.'
        projectMembers.value = []
      }
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
    if (!currentProject.value) return
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
        projectId: currentProject.value,
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
  
  const loadReleaseBurndown = async () => {
    if (!currentUser.value || !selectedReleaseId.value) {
      releaseBurndown.release = null
      releaseBurndown.range = null
      releaseBurndown.totalPoints = 0
      releaseBurndown.totalStories = 0
      releaseBurndown.series = []
      return
    }
  
    releaseBurndownError.value = ''
    isReleaseBurndownLoading.value = true
    try {
      const data = await fetchReleaseBurndown({
        releaseId: selectedReleaseId.value,
        userId: currentUser.value.id,
      })
      releaseBurndown.release = data.release ?? null
      releaseBurndown.range = data.range ?? null
      releaseBurndown.totalPoints = data.totalPoints ?? 0
      releaseBurndown.totalStories = data.totalStories ?? 0
      releaseBurndown.series = data.series ?? []
    } catch (error) {
      console.error('Error loading release burndown:', error)
      releaseBurndownError.value =
        error.message || 'Не удалось загрузить выгорание релиза.'
      releaseBurndown.release = null
      releaseBurndown.range = null
      releaseBurndown.totalPoints = 0
      releaseBurndown.totalStories = 0
      releaseBurndown.series = []
    } finally {
      isReleaseBurndownLoading.value = false
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
  
  watch(selectedReleaseId, () => {
    loadReleaseBurndown()
  })
  
  watch(currentPage, (value) => {
    if (value === 'archive' && userRole.value === 'admin') {
      loadReleases()
    }
  })
  
  watch(currentProject, async () => {
    if (!currentUser.value) return

    loadStories()
    // Загружаем участников проекта для всех пользователей (для назначения задач)
    loadProjectMembers()
    if (currentPage.value === 'archive' && userRole.value === 'admin') {
      loadReleases()
    }

    archiveData.summary = null
    archiveData.velocity = []
    archiveData.stories = []
    archiveData.range = null

    if (currentProject.value && ['team-lead', 'admin'].includes(userRole.value)) {
      await loadArchiveAnalytics()
    }
  })
  
  watch(userRole, () => {
    if (currentUser.value && currentProject.value && userRole.value === 'admin') {
      loadProjectMembers()
    }
  })
  
  watch(
    currentProjectInfo,
    (value) => {
      const normalizedIterationDays = Number.parseInt(value?.iterationDays, 10)
      projectSettingsForm.iterationDays =
        Number.isFinite(normalizedIterationDays) && normalizedIterationDays >= 1
          ? normalizedIterationDays
          : 14
      projectSettingsError.value = ''
      projectSettingsSuccess.value = ''
    },
    { immediate: true }
  )
  
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
  
  const releaseBurndownPlot = computed(() => {
    const series = releaseBurndown.series ?? []
    if (!series.length) return null
  
    const width = 600
    const height = 240
    const padding = 32
    const maxValue = Math.max(
      releaseBurndown.totalPoints || 0,
      ...series.map((point) => Number(point.remainingPoints ?? 0))
    )
    const safeMax = maxValue > 0 ? maxValue : 1
  
    const points = series.map((point, index) => {
      const progress = series.length === 1 ? 0 : index / (series.length - 1)
      const x = padding + (width - padding * 2) * progress
      const ratio = Number(point.remainingPoints ?? 0) / safeMax
      const y = padding + (height - padding * 2) * (1 - ratio)
      return {
        x,
        y,
        date: point.date,
        value: Number(point.remainingPoints ?? 0),
      }
    })
  
    return {
      width,
      height,
      padding,
      maxValue: safeMax,
      points,
      polyline: points.map((point) => `${point.x},${point.y}`).join(' '),
    }
  })
  
  const availableStoriesForRelease = computed(() =>
    stories.value.filter((story) => story.releaseId === null || story.releaseId === undefined)
  )
  
  const storiesInRelease = (releaseId) =>
    stories.value.filter((story) => Number(story.releaseId) === Number(releaseId))
  
  const userRoleLabel = computed(() => {
    return getRoleLabel(userRole.value)
  })
  
  const isTasksCollapsed = (storyId) => collapsedTasks[storyId] !== false
  
  const toggleTasksCollapsed = (storyId) => {
    collapsedTasks[storyId] = !isTasksCollapsed(storyId)
  }
  
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
    const estimate = Number(storyForm.estimate)
  
    if (!title) {
      storyError.value = 'Заполните название истории.'
      return
    }
  
    try {
      await createStory({
        title,
        estimate: Number.isFinite(estimate) && estimate > 0 ? estimate : 1,
        status: storyForm.status,
        ownerId: currentUser.value.id,
        projectId: currentProject.value,
      })
      storyForm.title = ''
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
  
    if (!title) {
      boardError.value = 'Заполните название истории.'
      return
    }
  
    try {
      await updateStory(storyId, {
        title,
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
  
  const editingTaskAssignment = ref(null)
  const taskAssignmentDrafts = reactive({})
  const editingTaskTitle = ref(null)
  const taskTitleDrafts = reactive({})
  
  const startAssigningTask = (storyId, taskId, task) => {
    editingTaskAssignment.value = `${storyId}-${taskId}`
    taskAssignmentDrafts[`${storyId}-${taskId}`] = {
      assignedTo: task.assignedTo || currentUser.value?.id || null,
      estimatedCompletionDate: task.estimatedCompletionDate
        ? new Date(task.estimatedCompletionDate).toISOString().slice(0, 16)
        : '',
    }
  }
  
  const cancelAssigningTask = (storyId, taskId) => {
    editingTaskAssignment.value = null
    delete taskAssignmentDrafts[`${storyId}-${taskId}`]
  }
  
  const saveTaskAssignment = async (storyId, taskId) => {
    if (!currentUser.value) return
    const draft = taskAssignmentDrafts[`${storyId}-${taskId}`]
    if (!draft) return
  
    try {
      const estimatedDate = draft.estimatedCompletionDate?.trim()
        ? draft.estimatedCompletionDate.trim()
        : null
      await assignTask(
        storyId,
        taskId,
        draft.assignedTo || null,
        estimatedDate
      )
      editingTaskAssignment.value = null
      delete taskAssignmentDrafts[`${storyId}-${taskId}`]
      await loadStories()
    } catch (error) {
      storyError.value = error.message || 'Не удалось назначить задачу.'
    }
  }
  
  const startEditingTaskTitle = (storyId, taskId, task) => {
    editingTaskTitle.value = `${storyId}-${taskId}`
    taskTitleDrafts[`${storyId}-${taskId}`] = task.title
  }
  
  const cancelEditingTaskTitle = (storyId, taskId) => {
    editingTaskTitle.value = null
    delete taskTitleDrafts[`${storyId}-${taskId}`]
  }
  
  const saveTaskTitle = async (storyId, taskId) => {
    const key = `${storyId}-${taskId}`
    const draft = (taskTitleDrafts[key] ?? '').trim()
    if (!draft) {
      storyError.value = 'Введите название задачи.'
      return
    }
  
    try {
      await updateTaskTitleApi(storyId, taskId, draft)
      editingTaskTitle.value = null
      delete taskTitleDrafts[key]
      await loadStories()
    } catch (error) {
      storyError.value = error.message || 'Не удалось обновить задачу.'
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

  const archiveDoneStories = async () => {
    if (!currentUser.value || userRole.value !== 'admin') return

    const doneStoryIds = stories.value
      .filter((story) => story.status === 'done')
      .map((story) => story.id)

    if (doneStoryIds.length <= 2) return
    if (!confirm(`Отправить в архив все истории из "Готово" (${doneStoryIds.length} шт.)?`)) return

    boardError.value = ''
    infoMessage.value = ''
    try {
      const results = await Promise.allSettled(
        doneStoryIds.map((storyId) => completeStoryApi(storyId, currentUser.value.id))
      )
      const archivedCount = results.filter((result) => result.status === 'fulfilled').length
      const failedCount = results.length - archivedCount

      if (archivedCount > 0) {
        await loadStories()
        await loadArchiveAnalytics()
        infoMessage.value = `В архив отправлено историй: ${archivedCount}.`
      }

      if (failedCount > 0) {
        boardError.value = `Не удалось архивировать историй: ${failedCount}.`
      }
    } catch (error) {
      boardError.value = error.message || 'Не удалось выполнить массовую архивацию.'
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

  return {
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
    archiveDoneStories,
    removeArchivedStory,
    toggleColumn
  }
}

