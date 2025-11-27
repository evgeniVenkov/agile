import mysql from 'mysql2/promise'
import dbConfig from '../config/dbConfig.js'

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  dateStrings: true,
  multipleStatements: true,
})

export default pool

