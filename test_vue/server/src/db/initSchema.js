import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pool from './pool.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const schemaPath = path.resolve(__dirname, '..', '..', 'schema.sql')

export const ensureSchema = async () => {
  const sql = await readFile(schemaPath, 'utf-8')
  if (!sql.trim()) return
  await pool.query(sql)
}



