import app from './app.js'
import { ensureSchema } from './db/initSchema.js'

const PORT = process.env.PORT || 4000

try {
  await ensureSchema()
  console.log('Database schema verified.')
} catch (error) {
  console.error('Failed to initialize database schema:', error)
  process.exit(1)
}

app.listen(PORT, () => {
  console.log(`Agile API listening on port ${PORT}`)
})

