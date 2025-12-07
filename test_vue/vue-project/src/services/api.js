const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = data?.message || 'Server error'
    throw new Error(message)
  }

  return data
}

export const registerUser = (payload) =>
  request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) })

export const loginUser = (payload) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) })

export const fetchStories = () => request('/api/stories')

export const createStory = (payload) =>
  request('/api/stories', { method: 'POST', body: JSON.stringify(payload) })

export const updateStoryStatus = (id, status, userId) =>
  request(`/api/stories/${id}`, { method: 'PATCH', body: JSON.stringify({ status, userId }) })

export const updateStoryEstimate = (id, estimate, userId) =>
  request(`/api/stories/${id}`, { method: 'PATCH', body: JSON.stringify({ estimate, userId }) })

export const addTask = (storyId, title) =>
  request(`/api/stories/${storyId}/tasks`, { method: 'POST', body: JSON.stringify({ title }) })

export const updateTaskState = (storyId, taskId, done) =>
  request(`/api/stories/${storyId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ done }),
  })

export const deleteTask = (storyId, taskId) =>
  request(`/api/stories/${storyId}/tasks/${taskId}`, { method: 'DELETE' })

export const deleteStory = (id, userId) =>
  request(`/api/stories/${id}`, { method: 'DELETE', body: JSON.stringify({ userId }) })

export const completeStory = (id, userId) =>
  request(`/api/stories/${id}/complete`, { method: 'POST', body: JSON.stringify({ userId }) })

export const fetchArchiveAnalytics = (params = {}) => {
  const query = new URLSearchParams()
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  if (params.userId) query.set('userId', params.userId)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request(`/api/analytics/archive${suffix}`)
}

export const deleteArchivedStory = (id) =>
  request(`/api/archive/${id}`, {
    method: 'DELETE',
  })