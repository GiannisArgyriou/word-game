const { Pool } = require('pg');

// Create PostgreSQL connection pool
// Railway will automatically provide DATABASE_URL environment variable
let pool = null;
let databaseAvailable = false;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('📦 PostgreSQL connection pool created');
} else {
  console.log('⚠️  DATABASE_URL not found - running without database');
  console.log('   Test results will be logged to console only');
  console.log('   On Railway, add PostgreSQL plugin to enable database storage');
}

// Initialize database table
async function initDatabase() {
  if (!pool) {
    console.log('⚠️  Skipping database initialization (no DATABASE_URL)');
    return;
  }

  try {
    console.log('🔄 Attempting to create database table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_results (
        id SERIAL PRIMARY KEY,
        player_name VARCHAR(255) NOT NULL,
        room_id VARCHAR(10) NOT NULL,
        language VARCHAR(5) NOT NULL,
        answers JSONB NOT NULL,
        score INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Add score column if it doesn't exist (for existing databases)
    await pool.query(`
      ALTER TABLE test_results 
      ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0
    `);
    
    databaseAvailable = true;
    console.log('✅ Database table initialized successfully');
    console.log('✅ Test results table ready');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    console.error('❌ Full error:', error);
    console.log('⚠️  App will continue but test results will only be logged to console');
  }
}

// Save test result to database
async function saveTestResult(testResult) {
  if (!pool || !databaseAvailable) {
    console.log('ℹ️  Database not available - test result logged to console only');
    return null;
  }

  try {
    const query = `
      INSERT INTO test_results (player_name, room_id, language, answers, score, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const values = [
      testResult.playerName,
      testResult.roomId,
      testResult.language,
      JSON.stringify(testResult.answers),
      testResult.score || 0,
      testResult.timestamp
    ];
    
    const result = await pool.query(query, values);
    console.log(`✅ Test result saved to database (ID: ${result.rows[0].id}) - Player: ${testResult.playerName}, Room: ${testResult.roomId}`);
    return result.rows[0].id;
  } catch (error) {
    console.error('❌ Error saving test result to database:', error.message);
    databaseAvailable = false; // Disable further attempts
    console.log('⚠️  Database disabled - future results will only be logged to console');
    return null;
  }
}

// Get all test results (optional - for viewing)
async function getAllTestResults() {
  if (!pool || !databaseAvailable) {
    return [];
  }

  try {
    const result = await pool.query(
      'SELECT * FROM test_results ORDER BY created_at DESC'
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching test results:', error.message);
    return [];
  }
}

// Get test results for a specific room
async function getTestResultsByRoom(roomId) {
  if (!pool || !databaseAvailable) {
    return [];
  }

  try {
    const result = await pool.query(
      'SELECT * FROM test_results WHERE room_id = $1 ORDER BY created_at DESC',
      [roomId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Error fetching test results by room:', error.message);
    return [];
  }
}

// Close database connection (for graceful shutdown)
async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('Database connection closed');
  }
}

module.exports = {
  initDatabase,
  saveTestResult,
  getAllTestResults,
  getTestResultsByRoom,
  closeDatabase
};
