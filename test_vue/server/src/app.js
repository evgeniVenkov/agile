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

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body ?? {}
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'password must be at least 6 characters' })
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username])
    if (existing.length) {
      return res.status(409).json({ message: 'username already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, passwordHash]
    )

    return res.status(201).json({ id: result.insertId, username })
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

    const [users] = await pool.query('SELECT id, password_hash FROM users WHERE username = ?', [
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

    return res.json({ id: user.id, username })
  } catch (error) {
    console.error('[login]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.get('/api/stories', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        s.id AS story_id,
        s.title AS story_title,
        s.description AS story_description,
        s.estimate AS story_estimate,
        s.status AS story_status,
        s.created_at AS story_created_at,
        s.owner_id,
        u.username AS story_owner,
        t.id AS task_id,
        t.title AS task_title,
        t.done AS task_done,
        t.created_at AS task_created_at
      FROM stories s
      LEFT JOIN users u ON u.id = s.owner_id
      LEFT JOIN story_tasks t ON t.story_id = s.id
      ORDER BY s.created_at DESC, t.created_at ASC`
    )

    return res.json({ stories: mapStories(rows) })
  } catch (error) {
    console.error('[stories:list]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.post('/api/stories', async (req, res) => {
  try {
    const { title, description, estimate = 1, status = 'backlog', ownerId } = req.body ?? {}
    if (!ownerId) {
      return res.status(401).json({ message: 'ownerId required' })
    }
    if (!title || !description) {
      return res.status(400).json({ message: 'title and description required' })
    }
    const normalizedEstimate = Number.isFinite(Number(estimate)) ? Math.max(1, Number(estimate)) : 1

    const [result] = await pool.query(
      `INSERT INTO stories (title, description, estimate, status, owner_id)
       VALUES (?, ?, ?, ?, ?)`,
      [title, description, normalizedEstimate, status, ownerId]
    )

    return res
      .status(201)
      .json({ id: result.insertId, title, description, estimate: normalizedEstimate, status })
  } catch (error) {
    console.error('[stories:create]', error)
    return res.status(500).json({ message: 'internal error' })
  }
})

app.patch('/api/stories/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body ?? {}
    if (!['backlog', 'ready', 'in-progress', 'done'].includes(status)) {
      return res.status(400).json({ message: 'invalid status' })
    }

    await pool.query('UPDATE stories SET status = ? WHERE id = ?', [status, id])
    return res.json({ id: Number(id), status })
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
    const { done } = req.body ?? {}

    const value = typeof done === 'boolean' ? done : null
    if (value === null) {
      return res.status(400).json({ message: 'done flag required' })
    }

    await pool.query('UPDATE story_tasks SET done = ? WHERE id = ? AND story_id = ?', [
      value ? 1 : 0,
      taskId,
      storyId,
    ])

    return res.json({ id: Number(taskId), done: value })
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
    const [rows] = await pool.query(
      `SELECT
        s.id AS story_id,
        s.title AS story_title,
        s.description AS story_description,
        s.estimate AS story_estimate,
        s.status AS story_status,
        s.created_at AS story_created_at,
        s.owner_id,
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
        (original_story_id, title, description, estimate, status, owner_id, owner_name, tasks_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        story.id,
        story.title,
        story.description,
        story.estimate,
        'done',
        story.ownerId || null,
        story.owner || null,
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
        tasks_json,
        completed_at
      FROM archived_stories
      WHERE completed_at BETWEEN ? AND ?
      ORDER BY completed_at DESC`,
      [fromBoundary, toBoundary]
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

