import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import pool from './db/pool.js'

const DAY_MS = 24 * 60 * 60 * 1000

const app = express()
app.use(cors())
app.use(express.json())

const mapStories = (rows) => {
  const storiesMap = new Map()

  rows.forEach((row) => {
    if (!storiesMap.has(row.story_id)) {
      storiesMap.set(row.story_id, {
        id: row.story_id,
        title: row.story_title,
        description: row.story_description,
        estimate: row.story_estimate,
        status: row.story_status,
        owner: row.story_owner,
        ownerId: row.owner_id,
        projectId: row.story_project_id ?? null,
        releaseId: row.story_release_id ?? null,
        createdAt: row.story_created_at,
        tasks: [],
      })
    }

    if (row.task_id) {
      storiesMap.get(row.story_id).tasks.push({
        id: row.task_id,
        title: row.task_title,
        done: !!row.task_done,
        createdAt: row.task_created_at,
        assignedTo: row.task_assigned_to,
        assignedToUsername: row.task_assigned_to_username,
        estimatedCompletionDate: row.task_estimated_completion_date,
        assignedAt: row.task_assigned_at,
      })
    }
  })

  return Array.from(storiesMap.values())
}

const parseDateParam = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const getUserRole = async (userId) => {
  if (!userId) return null
  try {
    const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [userId])
    return users.length ? (users[0].role || 'frontend-developer') : null
  } catch {
    return null
  }
}

const hasPermission = (userRole, requiredRoles) => {
  if (!userRole) return false
  if (userRole === 'admin') return true
  return requiredRoles.includes(userRole)
}

const isPrivilegedEstimatorRole = (userRole) => ['admin', 'team-lead'].includes(userRole)

const isProjectMember = async (userId, projectId) => {
  if (!userId || !projectId) return false
  try {
    const [members] = await pool.query(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [projectId, userId]
    )
    return members.length > 0
  } catch {
    return false
  }
}

const canModifyStory = async (userId, storyId, action = 'edit') => {
  const userRole = await getUserRole(userId)
  if (!userRole) return false
  
  try {
    const [stories] = await pool.query('SELECT owner_id, project_id FROM stories WHERE id = ?', [storyId])
    if (!stories.length) return false
    
    const story = stories[0]
    
    // Если история принадлежит проекту, проверяем членство
    if (story.project_id) {
      const isMember = await isProjectMember(userId, story.project_id)
      if (!isMember) return false
    }
    
    // Admin can do everything
    if (userRole === 'admin') return true
    
    // Team-lead can delete/archive any story
    if (action === 'delete' || action === 'archive') {
      return hasPermission(userRole, ['team-lead', 'admin'])
    }
    
    // For edit/update, check if user owns the story or is team-lead/admin
    if (action === 'edit' || action === 'update') {
      if (hasPermission(userRole, ['team-lead', 'admin'])) return true
      return story.owner_id === Number(userId)
    }
    
    return false
  } catch {
    return false
  }
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role = 'frontend-developer' } = req.body ?? {}
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'password must be at least 6 characters' })
    }
    if (!['admin', 'team-lead', 'backend-developer', 'frontend-developer', 'designer'].includes(role)) {
      return res.status(400).json({ message: 'invalid role' })
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username])
    if (existing.length) {
      return res.status(409).json({ message: 'username already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, passwordHash, role]
    )

    return res.status(201).json({ id: result.insertId, username, role })
  } catch (error) {
    console.error('[register]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body ?? {}
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' })
    }

    const [users] = await pool.query('SELECT id, password_hash, role FROM users WHERE username = ?', [
      username,
    ])

    if (!users.length) {
      return res.status(401).json({ message: 'invalid credentials' })
    }

    const user = users[0]
    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({ message: 'invalid credentials' })
    }

    return res.json({ id: user.id, username, role: user.role || 'frontend-developer' })
  } catch (error) {
    console.error('[login]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.get('/api/projects', async (req, res) => {
  try {
    const { userId } = req.query
    
    if (!userId) {
      return res.status(401).json({ message: 'userId required' })
    }

    // Получаем только проекты, где пользователь является участником
    const [rows] = await pool.query(
      `SELECT DISTINCT
        p.id,
        p.name,
        p.description,
        p.iteration_days,
        p.created_by,
        p.created_at,
        u.username AS creator_name
      FROM projects p
      INNER JOIN project_members pm ON pm.project_id = p.id
      LEFT JOIN users u ON u.id = p.created_by
      WHERE pm.user_id = ?
      ORDER BY p.created_at DESC`,
      [userId]
    )

    return res.json({ projects: rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      iterationDays: row.iteration_days ?? 14,
      createdBy: row.created_by,
      creatorName: row.creator_name,
      createdAt: row.created_at,
    })) })
  } catch (error) {
    console.error('[projects:list]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.post('/api/projects', async (req, res) => {
  try {
    const { name, description = '', createdBy, iterationDays } = req.body ?? {}
    if (!name || !createdBy) {
      return res.status(400).json({ message: 'name and createdBy are required' })
    }

    const normalizedName = String(name).trim()
    if (!normalizedName) {
      return res.status(400).json({ message: 'name cannot be empty' })
    }

    const normalizedIterationDays = Number.parseInt(iterationDays, 10)
    const safeIterationDays =
      Number.isFinite(normalizedIterationDays) && normalizedIterationDays >= 1
        ? Math.min(normalizedIterationDays, 365)
        : 14

    const [result] = await pool.query(
      `INSERT INTO projects (name, description, iteration_days, created_by)
       VALUES (?, ?, ?, ?)`,
      [normalizedName, String(description || '').trim(), safeIterationDays, createdBy]
    )

    // Автоматически добавляем создателя как участника проекта
    try {
      await pool.query(
        `INSERT INTO project_members (project_id, user_id, added_by)
         VALUES (?, ?, ?)`,
        [result.insertId, createdBy, createdBy]
      )
    } catch (memberError) {
      // Игнорируем ошибку, если пользователь уже участник (не должно произойти)
      console.warn('[projects:create] Failed to add creator as member:', memberError.message)
    }

    const [rows] = await pool.query(
      `SELECT 
        p.id,
        p.name,
        p.description,
        p.iteration_days,
        p.created_by,
        p.created_at,
        u.username AS creator_name
      FROM projects p
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.id = ?`,
      [result.insertId]
    )

    if (!rows.length) {
      return res.status(500).json({ message: 'failed to create project' })
    }

    const project = rows[0]
    return res.status(201).json({
      id: project.id,
      name: project.name,
      description: project.description,
      iterationDays: project.iteration_days ?? 14,
      createdBy: project.created_by,
      creatorName: project.creator_name,
      createdAt: project.created_at,
    })
  } catch (error) {
    console.error('[projects:create]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.patch('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { userId, name, iterationDays } = req.body ?? {}

    if (!userId) {
      return res.status(401).json({ message: 'userId required' })
    }

    const role = await getUserRole(userId)
    if (!hasPermission(role, ['admin'])) {
      return res.status(403).json({ message: 'access denied' })
    }

    const updates = []
    const values = []

    if (name !== undefined) {
      const normalizedName = String(name ?? '').trim()
      if (!normalizedName) {
        return res.status(400).json({ message: 'name cannot be empty' })
      }
      updates.push('name = ?')
      values.push(normalizedName)
    }

    if (iterationDays !== undefined) {
      const normalizedIterationDays = Number.parseInt(iterationDays, 10)
      if (!Number.isFinite(normalizedIterationDays) || normalizedIterationDays < 1) {
        return res.status(400).json({ message: 'iterationDays must be an integer greater than 0' })
      }
      updates.push('iteration_days = ?')
      values.push(Math.min(normalizedIterationDays, 365))
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'no fields to update' })
    }

    values.push(id)
    const [result] = await pool.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values)

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'project not found' })
    }

    const [rows] = await pool.query(
      `SELECT 
        p.id,
        p.name,
        p.description,
        p.iteration_days,
        p.created_by,
        p.created_at,
        u.username AS creator_name
      FROM projects p
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.id = ?`,
      [id]
    )

    if (!rows.length) {
      return res.status(500).json({ message: 'failed to update project' })
    }

    const project = rows[0]
    return res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      iterationDays: project.iteration_days ?? 14,
      createdBy: project.created_by,
      creatorName: project.creator_name,
      createdAt: project.created_at,
    })
  } catch (error) {
    console.error('[projects:update]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.get('/api/projects/:id/members', async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.query

    if (!userId) {
      return res.status(401).json({ message: 'userId required' })
    }

    // Проверяем, является ли пользователь участником проекта
    const isMember = await isProjectMember(userId, id)
    if (!isMember) {
      return res.status(403).json({ message: 'access denied: not a project member' })
    }

    const [rows] = await pool.query(
      `SELECT 
        pm.id,
        pm.project_id,
        pm.user_id,
        pm.added_by,
        pm.added_at,
        u.username,
        u.role,
        adder.username AS added_by_username
      FROM project_members pm
      INNER JOIN users u ON u.id = pm.user_id
      LEFT JOIN users adder ON adder.id = pm.added_by
      WHERE pm.project_id = ?
      ORDER BY pm.added_at ASC`,
      [id]
    )

    return res.json({
      members: rows.map(row => ({
        id: row.id,
        projectId: row.project_id,
        userId: row.user_id,
        username: row.username,
        role: row.role || 'frontend-developer',
        addedBy: row.added_by,
        addedByUsername: row.added_by_username,
        addedAt: row.added_at,
      })),
    })
  } catch (error) {
    console.error('[projects:members:list]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.post('/api/projects/:id/members', async (req, res) => {
  try {
    const { id } = req.params
    const { username, addedBy } = req.body ?? {}

    if (!username || !addedBy) {
      return res.status(400).json({ message: 'username and addedBy are required' })
    }

    const requesterRole = await getUserRole(addedBy)
    if (!hasPermission(requesterRole, ['admin'])) {
      return res.status(403).json({ message: 'insufficient permissions' })
    }

    // Найти пользователя по username
    const [users] = await pool.query('SELECT id FROM users WHERE username = ?', [username])
    if (!users.length) {
      return res.status(404).json({ message: 'user not found' })
    }

    const targetUserId = users[0].id

    // Проверить, что проект существует
    const [projects] = await pool.query('SELECT id FROM projects WHERE id = ?', [id])
    if (!projects.length) {
      return res.status(404).json({ message: 'project not found' })
    }

    // Проверить, не является ли пользователь уже участником
    const [existing] = await pool.query(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, targetUserId]
    )
    if (existing.length) {
      return res.status(409).json({ message: 'user is already a member of this project' })
    }

    // Добавить участника
    const [result] = await pool.query(
      `INSERT INTO project_members (project_id, user_id, added_by)
       VALUES (?, ?, ?)`,
      [id, targetUserId, addedBy]
    )

    // Получить информацию о добавленном участнике
    const [memberRows] = await pool.query(
      `SELECT 
        pm.id,
        pm.project_id,
        pm.user_id,
        pm.added_by,
        pm.added_at,
        u.username,
        u.role,
        adder.username AS added_by_username
      FROM project_members pm
      INNER JOIN users u ON u.id = pm.user_id
      LEFT JOIN users adder ON adder.id = pm.added_by
      WHERE pm.id = ?`,
      [result.insertId]
    )

    if (!memberRows.length) {
      return res.status(500).json({ message: 'failed to retrieve member info' })
    }

    const member = memberRows[0]
    return res.status(201).json({
      id: member.id,
      projectId: member.project_id,
      userId: member.user_id,
      username: member.username,
        role: member.role || 'frontend-developer',
      addedBy: member.added_by,
      addedByUsername: member.added_by_username,
      addedAt: member.added_at,
    })
  } catch (error) {
    console.error('[projects:members:add]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.delete('/api/projects/:id/members/:userId', async (req, res) => {
  try {
    const { id, userId: targetUserId } = req.params
    const { userId: requesterUserId } = req.body ?? {}

    if (!requesterUserId) {
      return res.status(401).json({ message: 'userId required' })
    }

    const requesterRole = await getUserRole(requesterUserId)
    if (!hasPermission(requesterRole, ['admin'])) {
      return res.status(403).json({ message: 'insufficient permissions' })
    }

    // Нельзя удалить создателя проекта
    const [projects] = await pool.query('SELECT created_by FROM projects WHERE id = ?', [id])
    if (!projects.length) {
      return res.status(404).json({ message: 'project not found' })
    }
    if (projects[0].created_by === Number(targetUserId)) {
      return res.status(400).json({ message: 'cannot remove project creator' })
    }

    const [result] = await pool.query(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
      [id, targetUserId]
    )

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'member not found' })
    }

    return res.status(204).send()
  } catch (error) {
    console.error('[projects:members:remove]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.get('/api/releases', async (req, res) => {
  try {
    const { projectId, userId } = req.query

    if (!projectId || !userId) {
      return res.status(400).json({ message: 'projectId and userId required' })
    }

    const role = await getUserRole(userId)
    if (!hasPermission(role, ['admin'])) {
      return res.status(403).json({ message: 'insufficient permissions' })
    }

    const isMember = await isProjectMember(userId, projectId)
    if (!isMember) {
      return res.status(403).json({ message: 'access denied: not a project member' })
    }

    const [rows] = await pool.query(
      `SELECT id, project_id, name, release_date, created_by, created_at
       FROM releases
       WHERE project_id = ?
       ORDER BY release_date DESC, created_at DESC`,
      [projectId]
    )

    return res.json({
      releases: rows.map((row) => ({
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        releaseDate: row.release_date,
        createdBy: row.created_by,
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    console.error('[releases:list]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.post('/api/releases', async (req, res) => {
  try {
    const { projectId, userId, name, releaseDate } = req.body ?? {}

    if (!projectId || !userId) {
      return res.status(400).json({ message: 'projectId and userId required' })
    }

    const role = await getUserRole(userId)
    if (!hasPermission(role, ['admin'])) {
      return res.status(403).json({ message: 'insufficient permissions' })
    }

    const isMember = await isProjectMember(userId, projectId)
    if (!isMember) {
      return res.status(403).json({ message: 'access denied: not a project member' })
    }

    const normalizedName = String(name ?? '').trim()
    if (!normalizedName) {
      return res.status(400).json({ message: 'name required' })
    }

    const normalizedDate = parseDateParam(releaseDate)
    if (!normalizedDate) {
      return res.status(400).json({ message: 'releaseDate required' })
    }

    const releaseDateValue = normalizedDate.toISOString().slice(0, 10)

    const [result] = await pool.query(
      `INSERT INTO releases (project_id, name, release_date, created_by)
       VALUES (?, ?, ?, ?)`,
      [projectId, normalizedName, releaseDateValue, userId]
    )

    const [rows] = await pool.query(
      `SELECT id, project_id, name, release_date, created_by, created_at
       FROM releases
       WHERE id = ?`,
      [result.insertId]
    )

    if (!rows.length) {
      return res.status(500).json({ message: 'failed to create release' })
    }

    const release = rows[0]
    return res.status(201).json({
      id: release.id,
      projectId: release.project_id,
      name: release.name,
      releaseDate: release.release_date,
      createdBy: release.created_by,
      createdAt: release.created_at,
    })
  } catch (error) {
    console.error('[releases:create]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.post('/api/releases/:id/stories', async (req, res) => {
  try {
    const { id } = req.params
    const { storyId, userId } = req.body ?? {}

    if (!storyId || !userId) {
      return res.status(400).json({ message: 'storyId and userId required' })
    }

    const role = await getUserRole(userId)
    if (!hasPermission(role, ['admin'])) {
      return res.status(403).json({ message: 'insufficient permissions' })
    }

    const [releaseRows] = await pool.query(
      'SELECT id, project_id FROM releases WHERE id = ?',
      [id]
    )
    if (!releaseRows.length) {
      return res.status(404).json({ message: 'release not found' })
    }

    const release = releaseRows[0]
    const isMember = await isProjectMember(userId, release.project_id)
    if (!isMember) {
      return res.status(403).json({ message: 'access denied: not a project member' })
    }

    const [storyRows] = await pool.query(
      'SELECT id, project_id FROM stories WHERE id = ?',
      [storyId]
    )
    if (!storyRows.length) {
      return res.status(404).json({ message: 'story not found' })
    }

    const story = storyRows[0]
    if (Number(story.project_id) !== Number(release.project_id)) {
      return res.status(400).json({ message: 'story does not belong to release project' })
    }

    await pool.query('UPDATE stories SET release_id = ? WHERE id = ?', [id, storyId])

    return res.json({ ok: true })
  } catch (error) {
    console.error('[releases:add-story]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.delete('/api/releases/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.body ?? {}

    if (!userId) {
      return res.status(400).json({ message: 'userId required' })
    }

    const role = await getUserRole(userId)
    if (!hasPermission(role, ['admin'])) {
      return res.status(403).json({ message: 'insufficient permissions' })
    }

    const [releaseRows] = await pool.query(
      'SELECT id, project_id FROM releases WHERE id = ?',
      [id]
    )
    if (!releaseRows.length) {
      return res.status(404).json({ message: 'release not found' })
    }

    const release = releaseRows[0]
    const isMember = await isProjectMember(userId, release.project_id)
    if (!isMember) {
      return res.status(403).json({ message: 'access denied: not a project member' })
    }

    const [result] = await pool.query('DELETE FROM releases WHERE id = ?', [id])
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'release not found' })
    }

    return res.status(204).send()
  } catch (error) {
    console.error('[releases:delete]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.get('/api/stories', async (req, res) => {
  try {
    const { projectId, userId } = req.query
    
    if (!userId) {
      return res.status(401).json({ message: 'userId required' })
    }

    let query = `
      SELECT
        s.id AS story_id,
        s.title AS story_title,
        s.description AS story_description,
        s.estimate AS story_estimate,
        s.status AS story_status,
        s.created_at AS story_created_at,
        s.owner_id,
        s.project_id AS story_project_id,
        s.release_id AS story_release_id,
        u.username AS story_owner,
        t.id AS task_id,
        t.title AS task_title,
        t.done AS task_done,
        t.created_at AS task_created_at,
        t.assigned_to AS task_assigned_to,
        t.estimated_completion_date AS task_estimated_completion_date,
        t.assigned_at AS task_assigned_at,
        assignee.username AS task_assigned_to_username
      FROM stories s
      LEFT JOIN users u ON u.id = s.owner_id
      LEFT JOIN story_tasks t ON t.story_id = s.id
      LEFT JOIN users assignee ON assignee.id = t.assigned_to
    `
    const params = []
    
    if (projectId) {
      // Проверяем, является ли пользователь участником проекта
      const isMember = await isProjectMember(userId, projectId)
      if (!isMember) {
        return res.status(403).json({ message: 'access denied: not a project member' })
      }
      query += ' WHERE s.project_id = ?'
      params.push(projectId)
    } else {
      // Для историй без проекта показываем только те, которые создал пользователь
      query += ' WHERE s.project_id IS NULL AND s.owner_id = ?'
      params.push(userId)
    }
    
    query += ' ORDER BY s.created_at DESC, t.created_at ASC'

    const [rows] = await pool.query(query, params)
    const storiesData = mapStories(rows)
    const storyIds = storiesData.map((story) => Number(story.id))
    const viewerRole = await getUserRole(userId)
    const isPrivilegedViewer = isPrivilegedEstimatorRole(viewerRole)
    const viewerId = Number(userId)

    if (!storyIds.length) {
      return res.json({ stories: storiesData })
    }

    const placeholders = storyIds.map(() => '?').join(', ')
    const [estimateRows] = await pool.query(
      `SELECT se.story_id, se.user_id, se.estimate, u.username
       FROM story_estimates se
       LEFT JOIN users u ON u.id = se.user_id
       WHERE se.story_id IN (${placeholders})`,
      storyIds
    )

    const estimatesByStory = new Map()
    estimateRows.forEach((row) => {
      const key = Number(row.story_id)
      const current = estimatesByStory.get(key) ?? []
      current.push({
        userId: Number(row.user_id),
        username: row.username || 'unknown',
        estimate: Number(row.estimate),
      })
      estimatesByStory.set(key, current)
    })

    const enrichedStories = storiesData.map((story) => {
      const storyEstimates = estimatesByStory.get(Number(story.id)) ?? []
      const ownEstimate = storyEstimates.find((item) => item.userId === viewerId)?.estimate ?? null
      const pokerAverage = storyEstimates.length
        ? Math.round(
            storyEstimates.reduce((sum, item) => sum + Number(item.estimate ?? 0), 0) /
              storyEstimates.length
          )
        : null

      if (story.status === 'ready' && !isPrivilegedViewer) {
        return {
          ...story,
          estimate: ownEstimate,
          ownEstimate,
          estimatesCount: storyEstimates.length,
          estimates: [],
        }
      }

      return {
        ...story,
        estimate: story.status === 'ready' ? pokerAverage ?? Number(story.estimate ?? 0) : Number(story.estimate ?? 0),
        ownEstimate,
        estimatesCount: storyEstimates.length,
        estimates: isPrivilegedViewer ? storyEstimates : [],
      }
    })

    return res.json({ stories: enrichedStories })
  } catch (error) {
    console.error('[stories:list]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.post('/api/stories', async (req, res) => {
  try {
    const { title, description = '', estimate = 1, status = 'backlog', ownerId, projectId } = req.body ?? {}
    if (!ownerId) {
      return res.status(401).json({ message: 'ownerId required' })
    }
    if (!title) {
      return res.status(400).json({ message: 'title required' })
    }
    const normalizedEstimate = Number.isFinite(Number(estimate)) ? Math.max(1, Number(estimate)) : 1
    const normalizedDescription = description?.trim() || ''
    const normalizedProjectId = projectId ? Number(projectId) : null

    // Если история создается для проекта, проверяем доступ
    if (normalizedProjectId) {
      const isMember = await isProjectMember(ownerId, normalizedProjectId)
      if (!isMember) {
        return res.status(403).json({ message: 'access denied: not a project member' })
      }
    }

    const [result] = await pool.query(
      `INSERT INTO stories (title, description, estimate, status, owner_id, project_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, normalizedDescription, normalizedEstimate, status, ownerId, normalizedProjectId]
    )

    return res
      .status(201)
      .json({ id: result.insertId, title, description, estimate: normalizedEstimate, status, projectId: normalizedProjectId })
  } catch (error) {
    console.error('[stories:create]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.patch('/api/stories/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, estimate, userId, title, description } = req.body ?? {}

    let story = null
    if (status !== undefined || estimate !== undefined || title !== undefined || description !== undefined) {
      const [storyRows] = await pool.query(
        'SELECT id, status, owner_id, project_id FROM stories WHERE id = ?',
        [id]
      )
      if (!storyRows.length) {
        return res.status(404).json({ message: 'story not found' })
      }
      story = storyRows[0]
    }

    let checkedUpdatePermission = false
    const ensureUpdatePermission = async () => {
      if (checkedUpdatePermission) return true
      if (!userId) return false
      const canUpdate = await canModifyStory(userId, id, 'update')
      if (!canUpdate) return false
      checkedUpdatePermission = true
      return true
    }

    const updates = []
    const values = []
    
    if (status !== undefined) {
      if (!(await ensureUpdatePermission())) {
        return res.status(403).json({ message: 'insufficient permissions' })
      }
      if (!['backlog', 'ready', 'in-progress', 'done'].includes(status)) {
        return res.status(400).json({ message: 'invalid status' })
      }
      updates.push('status = ?')
      values.push(status)
    }
    
    if (estimate !== undefined) {
      const normalizedEstimate = Number.isFinite(Number(estimate)) ? Math.max(1, Number(estimate)) : 1
      const effectiveStatus = status !== undefined ? status : story?.status

      if (effectiveStatus === 'backlog') {
        return res.status(400).json({ message: 'estimate is not allowed for backlog stories' })
      }

      if (effectiveStatus === 'ready') {
        if (!userId) {
          return res.status(401).json({ message: 'userId required' })
        }
        if (story?.project_id) {
          const member = await isProjectMember(userId, story.project_id)
          if (!member) {
            return res.status(403).json({ message: 'access denied: not a project member' })
          }
        }

        await pool.query(
          `INSERT INTO story_estimates (story_id, user_id, estimate)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE estimate = VALUES(estimate), updated_at = CURRENT_TIMESTAMP`,
          [id, userId, normalizedEstimate]
        )

        const [aggregateRows] = await pool.query(
          'SELECT ROUND(AVG(estimate)) AS avg_estimate FROM story_estimates WHERE story_id = ?',
          [id]
        )
        const aggregatedEstimate = Number(aggregateRows[0]?.avg_estimate ?? normalizedEstimate)
        updates.push('estimate = ?')
        values.push(aggregatedEstimate)
      } else {
        if (!(await ensureUpdatePermission())) {
          return res.status(403).json({ message: 'insufficient permissions' })
        }
        updates.push('estimate = ?')
        values.push(normalizedEstimate)
      }
    }

    if (title !== undefined) {
      if (!(await ensureUpdatePermission())) {
        return res.status(403).json({ message: 'insufficient permissions' })
      }
      const normalizedTitle = String(title ?? '').trim()
      if (!normalizedTitle) {
        return res.status(400).json({ message: 'title required' })
      }
      updates.push('title = ?')
      values.push(normalizedTitle)
    }

    if (description !== undefined) {
      if (!(await ensureUpdatePermission())) {
        return res.status(403).json({ message: 'insufficient permissions' })
      }
      const normalizedDescription = String(description ?? '').trim()
      updates.push('description = ?')
      values.push(normalizedDescription)
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: 'no fields to update' })
    }
    
    values.push(id)
    await pool.query(`UPDATE stories SET ${updates.join(', ')} WHERE id = ?`, values)
    
    const [rows] = await pool.query(
      `SELECT id, title, description, estimate, status, owner_id FROM stories WHERE id = ?`,
      [id]
    )
    if (!rows.length) {
      return res.status(404).json({ message: 'story not found' })
    }

    const updatedStory = rows[0]
    return res.json({
      id: updatedStory.id,
      title: updatedStory.title,
      description: updatedStory.description,
      estimate: Number(updatedStory.estimate ?? 0),
      status: updatedStory.status,
      ownerId: updatedStory.owner_id,
    })
  } catch (error) {
    console.error('[stories:update]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.post('/api/stories/:id/tasks', async (req, res) => {
  try {
    const { id } = req.params
    const { title } = req.body ?? {}
    if (!title) {
      return res.status(400).json({ message: 'title required' })
    }

    const [result] = await pool.query(
      'INSERT INTO story_tasks (story_id, title, done) VALUES (?, ?, 0)',
      [id, title]
    )

    return res.status(201).json({ id: result.insertId, title, done: false })
  } catch (error) {
    console.error('[tasks:create]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.patch('/api/stories/:storyId/tasks/:taskId', async (req, res) => {
  try {
    const { storyId, taskId } = req.params
    const { done, assignedTo, estimatedCompletionDate, title } = req.body ?? {}

    const updates = []
    const values = []

    if (title !== undefined) {
      const trimmedTitle = String(title ?? '').trim()
      if (!trimmedTitle) {
        return res.status(400).json({ message: 'title required' })
      }
      updates.push('title = ?')
      values.push(trimmedTitle)
    }

    if (typeof done === 'boolean') {
      updates.push('done = ?')
      values.push(done ? 1 : 0)
    }

    if (assignedTo !== undefined) {
      if (assignedTo === null || assignedTo === '') {
        updates.push('assigned_to = NULL')
        updates.push('assigned_at = NULL')
      } else {
        updates.push('assigned_to = ?')
        updates.push('assigned_at = CURRENT_TIMESTAMP')
        values.push(assignedTo)
      }
    }

    if (estimatedCompletionDate !== undefined) {
      if (estimatedCompletionDate === null || estimatedCompletionDate === '') {
        updates.push('estimated_completion_date = NULL')
      } else {
        updates.push('estimated_completion_date = ?')
        values.push(estimatedCompletionDate)
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'no fields to update' })
    }

    values.push(taskId, storyId)
    await pool.query(
      `UPDATE story_tasks SET ${updates.join(', ')} WHERE id = ? AND story_id = ?`,
      values
    )

    // Получаем обновленную задачу
    const [rows] = await pool.query(
      `SELECT 
        t.id,
        t.title,
        t.done,
        t.assigned_to,
        t.estimated_completion_date,
        t.assigned_at,
        u.username AS assigned_to_username
      FROM story_tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.id = ? AND t.story_id = ?`,
      [taskId, storyId]
    )

    if (!rows.length) {
      return res.status(404).json({ message: 'task not found' })
    }

    const task = rows[0]
    return res.json({
      id: Number(taskId),
      title: task.title,
      done: !!task.done,
      assignedTo: task.assigned_to,
      assignedToUsername: task.assigned_to_username,
      estimatedCompletionDate: task.estimated_completion_date,
      assignedAt: task.assigned_at,
    })
  } catch (error) {
    console.error('[tasks:update]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.delete('/api/stories/:storyId/tasks/:taskId', async (req, res) => {
  try {
    const { storyId, taskId } = req.params
    const [result] = await pool.query('DELETE FROM story_tasks WHERE id = ? AND story_id = ?', [
      taskId,
      storyId,
    ])

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'task not found' })
    }

    return res.status(204).send()
  } catch (error) {
    console.error('[tasks:delete]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.delete('/api/stories/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.body ?? {}
    
    if (!userId) {
      return res.status(401).json({ message: 'userId required' })
    }
    
    const canDelete = await canModifyStory(userId, id, 'delete')
    if (!canDelete) {
      return res.status(403).json({ message: 'insufficient permissions' })
    }
    
    const [result] = await pool.query('DELETE FROM stories WHERE id = ?', [id])
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'story not found' })
    }
    return res.status(204).send()
  } catch (error) {
    console.error('[stories:delete]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.post('/api/stories/:id/complete', async (req, res) => {
  try {
    const { id } = req.params
    const { userId } = req.body ?? {}
    
    if (!userId) {
      return res.status(401).json({ message: 'userId required' })
    }
    
    const canArchive = await canModifyStory(userId, id, 'archive')
    if (!canArchive) {
      return res.status(403).json({ message: 'insufficient permissions' })
    }
    const [rows] = await pool.query(
      `SELECT
        s.id AS story_id,
        s.title AS story_title,
        s.description AS story_description,
        s.estimate AS story_estimate,
        s.status AS story_status,
        s.created_at AS story_created_at,
        s.owner_id,
        s.project_id AS story_project_id,
        s.release_id AS story_release_id,
        u.username AS story_owner,
        t.id AS task_id,
        t.title AS task_title,
        t.done AS task_done,
        t.created_at AS task_created_at
      FROM stories s
      LEFT JOIN users u ON u.id = s.owner_id
      LEFT JOIN story_tasks t ON t.story_id = s.id
      WHERE s.id = ?`,
      [id]
    )

    if (!rows.length) {
      return res.status(404).json({ message: 'story not found' })
    }

    const [story] = mapStories(rows)

    const [result] = await pool.query(
      `INSERT INTO archived_stories
        (original_story_id, title, description, estimate, status, owner_id, owner_name, project_id, release_id, tasks_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        story.id,
        story.title,
        story.description,
        story.estimate,
        'done',
        story.ownerId || null,
        story.owner || null,
        story.projectId || null,
        story.releaseId || null,
        JSON.stringify(story.tasks ?? []),
      ]
    )

    await pool.query('DELETE FROM stories WHERE id = ?', [id])

    return res.json({ archivedId: result.insertId })
  } catch (error) {
    console.error('[stories:complete]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.get('/api/analytics/archive', async (req, res) => {
  try {
    const { userId, projectId } = req.query
    if (userId) {
      const userRole = await getUserRole(userId)
      if (!hasPermission(userRole, ['team-lead', 'admin'])) {
        return res.status(403).json({ message: 'insufficient permissions' })
      }
    }

    if (!projectId) {
      return res.status(400).json({ message: 'projectId required' })
    }

    const isMember = await isProjectMember(userId, projectId)
    if (!isMember) {
      return res.status(403).json({ message: 'access denied: not a project member' })
    }
    
    const now = new Date()
    let toDate = parseDateParam(req.query.to) ?? now
    let fromDate =
      parseDateParam(req.query.from) ?? new Date(toDate.getTime() - 29 * DAY_MS)

    if (fromDate > toDate) {
      const temp = fromDate
      fromDate = toDate
      toDate = temp
    }

    const fromBoundary = new Date(fromDate)
    fromBoundary.setHours(0, 0, 0, 0)
    const toBoundary = new Date(toDate)
    toBoundary.setHours(23, 59, 59, 999)

    const [rows] = await pool.query(
      `SELECT
        id,
        original_story_id,
        title,
        description,
        estimate,
        status,
        owner_id,
        owner_name,
        project_id,
        tasks_json,
        completed_at
      FROM archived_stories
      WHERE project_id = ? AND completed_at BETWEEN ? AND ?
      ORDER BY completed_at DESC`,
      [projectId, fromBoundary, toBoundary]
    )

    const stories = rows.map((row) => {
      let tasks = []
      const rawTasks = row.tasks_json
      if (Array.isArray(rawTasks)) {
        tasks = rawTasks
      } else if (rawTasks) {
        try {
          tasks = JSON.parse(rawTasks)
        } catch {
          tasks = []
        }
      }

      return {
        id: row.id,
        originalId: row.original_story_id,
        title: row.title,
        description: row.description,
        estimate: Number(row.estimate ?? 0),
        status: row.status,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        projectId: row.project_id,
        tasks,
        completedAt: row.completed_at,
      }
    })

    const summary = stories.reduce(
      (acc, story) => {
        acc.totalStories += 1
        acc.totalPoints += story.estimate
        const tasksCount = story.tasks?.length ?? 0
        acc.totalTasks += tasksCount
        acc.doneTasks += story.tasks?.filter((task) => task.done).length ?? 0
        if (story.ownerName) {
          acc.owners.add(story.ownerName)
        }
        return acc
      },
      { totalStories: 0, totalPoints: 0, totalTasks: 0, doneTasks: 0, owners: new Set() }
    )

    const velocityMap = new Map()
    stories.forEach((story) => {
      const dateKey = new Date(story.completedAt).toISOString().slice(0, 10)
      const entry = velocityMap.get(dateKey) ?? { date: dateKey, stories: 0, points: 0 }
      entry.stories += 1
      entry.points += story.estimate
      velocityMap.set(dateKey, entry)
    })

    const velocity = Array.from(velocityMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    return res.json({
      range: {
        from: fromBoundary.toISOString(),
        to: toBoundary.toISOString(),
      },
      summary: {
        totalStories: summary.totalStories,
        totalPoints: summary.totalPoints,
        totalTasks: summary.totalTasks,
        doneTasks: summary.doneTasks,
        ownerCount: summary.owners.size,
      },
      velocity,
      stories,
    })
  } catch (error) {
    console.error('[analytics:archive]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.get('/api/analytics/release-burndown', async (req, res) => {
  try {
    const { userId, releaseId } = req.query
    if (!userId || !releaseId) {
      return res.status(400).json({ message: 'userId and releaseId required' })
    }

    const userRole = await getUserRole(userId)
    if (!hasPermission(userRole, ['team-lead', 'admin'])) {
      return res.status(403).json({ message: 'insufficient permissions' })
    }

    const [releaseRows] = await pool.query(
      'SELECT id, project_id, name, release_date, created_at FROM releases WHERE id = ?',
      [releaseId]
    )
    if (!releaseRows.length) {
      return res.status(404).json({ message: 'release not found' })
    }

    const release = releaseRows[0]
    const isMember = await isProjectMember(userId, release.project_id)
    if (!isMember) {
      return res.status(403).json({ message: 'access denied: not a project member' })
    }

    const startDate = parseDateParam(release.created_at) || parseDateParam(release.release_date)
    const endDate = parseDateParam(release.release_date)
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'release dates required' })
    }

    const fromBoundary = new Date(startDate)
    fromBoundary.setHours(0, 0, 0, 0)
    const toBoundary = new Date(endDate)
    toBoundary.setHours(23, 59, 59, 999)
    if (fromBoundary > toBoundary) {
      toBoundary.setTime(fromBoundary.getTime())
    }

    const [totals] = await pool.query(
      `
        SELECT
          SUM(estimate) AS totalPoints,
          COUNT(*) AS totalStories
        FROM (
          SELECT estimate FROM stories WHERE release_id = ?
          UNION ALL
          SELECT estimate FROM archived_stories WHERE release_id = ?
        ) t
      `,
      [releaseId, releaseId]
    )

    const totalPoints = Number(totals[0]?.totalPoints ?? 0)
    const totalStories = Number(totals[0]?.totalStories ?? 0)

    const [completedRows] = await pool.query(
      `
        SELECT DATE(completed_at) AS completed_date, SUM(estimate) AS points
        FROM archived_stories
        WHERE release_id = ? AND completed_at BETWEEN ? AND ?
        GROUP BY DATE(completed_at)
        ORDER BY completed_date ASC
      `,
      [releaseId, fromBoundary, toBoundary]
    )

    const completedMap = new Map()
    completedRows.forEach((row) => {
      const dateKey = new Date(row.completed_date).toISOString().slice(0, 10)
      completedMap.set(dateKey, Number(row.points ?? 0))
    })

    const series = []
    let cumulative = 0
    for (let day = new Date(fromBoundary); day <= toBoundary; day = new Date(day.getTime() + DAY_MS)) {
      const dateKey = day.toISOString().slice(0, 10)
      const completedPoints = Number(completedMap.get(dateKey) ?? 0)
      cumulative += completedPoints
      const remainingPoints = Math.max(totalPoints - cumulative, 0)
      series.push({
        date: dateKey,
        completedPoints,
        cumulativeCompleted: cumulative,
        remainingPoints,
      })
    }

    return res.json({
      release: {
        id: release.id,
        name: release.name,
        releaseDate: release.release_date,
        createdAt: release.created_at,
      },
      range: {
        from: fromBoundary.toISOString(),
        to: toBoundary.toISOString(),
      },
      totalPoints,
      totalStories,
      series,
    })
  } catch (error) {
    console.error('[analytics:release-burndown]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { userId, password, role } = req.body ?? {}

    if (!userId) {
      return res.status(401).json({ message: 'userId required' })
    }

    const requesterRole = await getUserRole(userId)
    if (!requesterRole) {
      return res.status(401).json({ message: 'invalid user' })
    }

    const isSelf = Number(userId) === Number(id)
    if (!isSelf && requesterRole !== 'admin') {
      return res.status(403).json({ message: 'insufficient permissions' })
    }

    const updates = []
    const values = []

    if (password !== undefined) {
      if (typeof password !== 'string' || password.trim().length < 6) {
        return res.status(400).json({ message: 'password must be at least 6 characters' })
      }
      const passwordHash = await bcrypt.hash(password.trim(), 10)
      updates.push('password_hash = ?')
      values.push(passwordHash)
    }

    if (role !== undefined) {
      if (!['admin', 'team-lead', 'backend-developer', 'frontend-developer', 'designer'].includes(role)) {
        return res.status(400).json({ message: 'invalid role' })
      }
      updates.push('role = ?')
      values.push(role)
    }

    if (!updates.length) {
      return res.status(400).json({ message: 'no fields to update' })
    }

    values.push(id)
    const [result] = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values)
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'user not found' })
    }

    const [rows] = await pool.query('SELECT id, username, role FROM users WHERE id = ?', [id])
    if (!rows.length) {
      return res.status(404).json({ message: 'user not found' })
    }

    const user = rows[0]
    return res.json({ id: user.id, username: user.username, role: user.role || 'frontend-developer' })
  } catch (error) {
    console.error('[users:update]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.delete('/api/archive/:id', async (req, res) => {
  try {
    const { id } = req.params
    const [result] = await pool.query('DELETE FROM archived_stories WHERE id = ?', [id])
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'archived story not found' })
    }
    return res.status(204).send()
  } catch (error) {
    console.error('[archive:delete]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

export default app
