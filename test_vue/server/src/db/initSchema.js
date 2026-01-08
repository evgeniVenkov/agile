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
        ADD COLUMN role ENUM('admin', 'team-lead', 'backend-developer', 'frontend-developer', 'designer') NOT NULL DEFAULT 'frontend-developer'
      `)
      console.log('Migration: added role column to users table')
    } else {
      // Migration: update role enum to new values
      try {
        await pool.query(`
          ALTER TABLE users 
          MODIFY COLUMN role ENUM('admin', 'team-lead', 'backend-developer', 'frontend-developer', 'designer') NOT NULL DEFAULT 'frontend-developer'
        `)
        // Migrate old roles to new ones
        await pool.query(`
          UPDATE users 
          SET role = CASE 
            WHEN role = 'admin' THEN 'admin'
            WHEN role = 'manager' THEN 'team-lead'
            WHEN role = 'developer' THEN 'frontend-developer'
            ELSE 'frontend-developer'
          END
        `)
        console.log('Migration: updated role enum to new values')
      } catch (error) {
        console.warn('Migration warning (role update):', error.message)
      }
    }
  } catch (error) {
    console.warn('Migration warning:', error.message)
  }

  // Migration: add projects table if it doesn't exist
  try {
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'projects'
    `)
    
    if (tables.length === 0) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          created_by INT UNSIGNED NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_project_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
        )
      `)
      console.log('Migration: added projects table')
    }
  } catch (error) {
    console.warn('Migration warning:', error.message)
  }

  // Migration: add project_id to stories if it doesn't exist
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'stories' 
      AND COLUMN_NAME = 'project_id'
    `)
    
    if (columns.length === 0) {
      await pool.query(`
        ALTER TABLE stories 
        ADD COLUMN project_id INT UNSIGNED,
        ADD CONSTRAINT fk_story_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
      `)
      console.log('Migration: added project_id column to stories table')
    }
  } catch (error) {
    console.warn('Migration warning:', error.message)
  }

  // Migration: add project_members table if it doesn't exist
  try {
    const [tables] = await pool.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'project_members'
    `)
    
    if (tables.length === 0) {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS project_members (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          project_id INT UNSIGNED NOT NULL,
          user_id INT UNSIGNED NOT NULL,
          added_by INT UNSIGNED NOT NULL,
          added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_member_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
          CONSTRAINT fk_member_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          CONSTRAINT fk_member_adder FOREIGN KEY (added_by) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE KEY unique_project_user (project_id, user_id)
        )
      `)
      console.log('Migration: added project_members table')
    }
  } catch (error) {
    console.warn('Migration warning:', error.message)
  }

  // Migration: add assignment fields to story_tasks if they don't exist
  try {
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'story_tasks' 
      AND COLUMN_NAME = 'assigned_to'
    `)
    
    if (columns.length === 0) {
      await pool.query(`
        ALTER TABLE story_tasks 
        ADD COLUMN assigned_to INT UNSIGNED,
        ADD COLUMN estimated_completion_date DATETIME,
        ADD COLUMN assigned_at TIMESTAMP NULL,
        ADD CONSTRAINT fk_task_assignee FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL
      `)
      console.log('Migration: added assignment fields to story_tasks table')
    }
  } catch (error) {
    console.warn('Migration warning:', error.message)
  }
}



