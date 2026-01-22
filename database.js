const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Create PostgreSQL connection pool
// Railway will automatically provide DATABASE_URL environment variable
let pool = null;
let databaseAvailable = false;
const failedSaves = []; // Queue for failed saves to retry
const BACKUP_DIR = path.join(__dirname, 'test_backups');

// Ensure backup directory exists
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create backup directory:', err);
  }
}

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('📦 PostgreSQL connection pool created');
  ensureBackupDir(); // Create backup directory
} else {
  console.log('⚠️  DATABASE_URL not found - running without database');
  console.log('   Test results will be logged to console only');
  console.log('   On Railway, add PostgreSQL plugin to enable database storage');
  ensureBackupDir(); // Still create backup directory for file storage
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

// Save test result to database with retry logic and backup
async function saveTestResult(testResult, retryCount = 0) {
  const MAX_RETRIES = 3;
  
  // Always save to file backup first as insurance
  await saveToFileBackup(testResult);
  
  if (!pool) {
    console.log('⚠️  No database pool - test result saved to file backup only');
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
    const insertId = result.rows[0].id;
    
    // Mark database as available on successful save
    if (!databaseAvailable) {
      databaseAvailable = true;
      console.log('✅ Database connection restored');
    }
    
    return insertId;
  } catch (error) {
    console.error(`❌ Error saving test result to database (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error.message);
    
    // Retry with exponential backoff
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return saveTestResult(testResult, retryCount + 1);
    }
    
    // All retries failed - add to queue for later retry
    console.error('❌ All retry attempts failed. Adding to retry queue.');
    console.error('❌ Failed data:', {
      playerName: testResult.playerName,
      roomId: testResult.roomId,
      language: testResult.language,
      score: testResult.score
    });
    
    failedSaves.push({ testResult, attempts: 0, addedAt: Date.now() });
    databaseAvailable = false;
    
    // File backup already saved, so data is not lost
    console.log('💾 Test result preserved in file backup');
    
    throw error; // Re-throw so caller knows it failed
  }
}

// Save test result to file as backup
async function saveToFileBackup(testResult) {
  try {
    const filename = `test_${testResult.roomId}_${testResult.playerName}_${Date.now()}.json`;
    const filepath = path.join(BACKUP_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(testResult, null, 2));
    console.log(`💾 Test result backed up to file: ${filename}`);
  } catch (error) {
    console.error('❌ CRITICAL: Failed to save file backup:', error);
    // This is critical - log to console as absolute last resort
    console.log('📋 TEST RESULT (CONSOLE BACKUP):', JSON.stringify(testResult));
  }
}

// Background job to retry failed saves
function startRetryWorker() {
  setInterval(async () => {
    if (failedSaves.length === 0) return;
    
    console.log(`🔄 Attempting to save ${failedSaves.length} queued test results...`);
    
    const toRetry = [...failedSaves];
    failedSaves.length = 0; // Clear queue
    
    for (const item of toRetry) {
      try {
        const id = await saveTestResult(item.testResult, 0);
        if (id) {
          console.log(`✅ Successfully saved queued test result (ID: ${id}) - Player: ${item.testResult.playerName}`);
        }
      } catch (error) {
        // Still failing - keep in queue if not too old (24 hours)
        const age = Date.now() - item.addedAt;
        if (age < 24 * 60 * 60 * 1000) {
          item.attempts++;
          failedSaves.push(item);
        } else {
          console.error(`❌ Giving up on test result after 24 hours - Player: ${item.testResult.playerName}`);
        }
      }
    }
  }, 60000); // Retry every minute
}

// Start retry worker
startRetryWorker();

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
