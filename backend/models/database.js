const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../tasks.db');

class Database {
  constructor() {
    this.db = null;
  }

  // Initialize database connection and create tables
  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
          return;
        }
        console.log('Connected to SQLite database.');
        this.createTables()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  // Create all necessary tables
  async createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK (role IN ('admin', 'trabajador')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createTasksTable = `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'inactivo', 'finalizado')),
        priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baja', 'media', 'alta')),
        assigned_to INTEGER,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        due_date DATE,
        progress_state TEXT NOT NULL DEFAULT 'inicializado' CHECK (progress_state IN ('inicializado', 'en proceso', 'finalizado')),
        FOREIGN KEY (assigned_to) REFERENCES users (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )
    `;

    const createUpdatesTable = `
      CREATE TABLE IF NOT EXISTS updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        comment TEXT,
        progress_state TEXT DEFAULT 'inicializado' CHECK (progress_state IN ('inicializado', 'en proceso', 'finalizado')),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_updates_task_id ON updates(task_id);
      CREATE INDEX IF NOT EXISTS idx_updates_timestamp ON updates(timestamp);
    `;

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createUsersTable);
        this.db.run(createTasksTable);
        this.db.run(createUpdatesTable);
        this.db.run(createIndexes, (err) => {
          if (err) {
            console.error('Error creating tables:', err.message);
            reject(err);
          } else {
            console.log('Database tables created successfully.');
            this.migrateProgressToStates()
              .then(() => this.createDefaultAdmin())
              .then(() => resolve())
              .catch(reject);
          }
        });
      });
    });
  }

  // Migrate existing progress data to new state system
  async migrateProgressToStates() {
    return new Promise((resolve, reject) => {
      // Check if progress_state column exists in tasks table
      this.db.all("PRAGMA table_info(tasks)", (err, columns) => {
        if (err) {
          reject(err);
          return;
        }

        const hasProgressState = columns.some(col => col.name === 'progress_state');
        const hasProgress = columns.some(col => col.name === 'progress');

        if (!hasProgressState && hasProgress) {
          // Add progress_state column to existing tasks table
          this.db.run(`
            ALTER TABLE tasks ADD COLUMN progress_state TEXT NOT NULL DEFAULT 'inicializado' CHECK (progress_state IN ('inicializado', 'en proceso', 'finalizado'))
          `, (err) => {
            if (err) {
              reject(err);
              return;
            }

            // Migrate existing progress values to states
            this.db.run(`
              UPDATE tasks
              SET progress_state = CASE
                WHEN progress = 0 THEN 'inicializado'
                WHEN progress > 0 AND progress < 100 THEN 'en proceso'
                WHEN progress = 100 THEN 'finalizado'
                ELSE 'inicializado'
              END
            `, (err) => {
              if (err) {
                reject(err);
                return;
              }

              // Remove progress column from tasks table
              this.db.run(`
                ALTER TABLE tasks DROP COLUMN progress
              `, (err) => {
                if (err) {
                  console.warn('Warning: Could not drop progress column from tasks:', err.message);
                }
                resolve();
              });
            });
          });
        } else if (!hasProgressState) {
          // Add progress_state column if table doesn't have it
          this.db.run(`
            ALTER TABLE tasks ADD COLUMN progress_state TEXT NOT NULL DEFAULT 'inicializado' CHECK (progress_state IN ('inicializado', 'en proceso', 'finalizado'))
          `, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  }

  // Create default admin user if no users exist
  async createDefaultAdmin() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count === 0) {
          // Create default admin user
          this.db.run(
            'INSERT INTO users (name, role) VALUES (?, ?)',
            ['admin', 'admin'],
            function(err) {
              if (err) {
                console.error('Error creating default admin:', err.message);
                reject(err);
              } else {
                console.log('Default admin user created successfully.');
                resolve();
              }
            }
          );
        } else {
          resolve();
        }
      });
    });
  }

  // Generic query helper
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Generic run helper for INSERT, UPDATE, DELETE
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Get single row
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Close database connection
  close(callback) {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
          if (callback) callback(err);
        } else {
          console.log('Database connection closed.');
          if (callback) callback(null);
        }
      });
    } else {
      if (callback) callback(null);
    }
  }
}

module.exports = new Database();