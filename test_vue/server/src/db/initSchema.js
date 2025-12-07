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
  
  // Migration: add role column if it doesn't exist
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'role'
    `)
    
    if (columns.length === 0) {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN role ENUM('developer', 'manager', 'admin') NOT NULL DEFAULT 'developer'
      `)
      console.log('Migration: added role column to users table')
    }
  } catch (error) {
    console.warn('Migration warning:', error.message)
  }
}



