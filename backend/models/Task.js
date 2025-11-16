const db = require('./database');

class Task {
  // Get all tasks with optional filtering
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT
          t.id,
          t.title,
          t.description,
          t.status,
          t.priority,
          t.assigned_to,
          t.created_by,
          t.created_at,
          t.updated_at,
          t.due_date,
          t.progress_state,
          creator.name as creator_name,
          assigned.name as assigned_name
        FROM tasks t
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users assigned ON t.assigned_to = assigned.id
        WHERE 1=1
      `;

      const params = [];

      // Add filters
      if (filters.status) {
        query += ' AND t.status = ?';
        params.push(filters.status);
      }

      if (filters.assigned_to) {
        query += ' AND t.assigned_to = ?';
        params.push(filters.assigned_to);
      }

      if (filters.priority) {
        query += ' AND t.priority = ?';
        params.push(filters.priority);
      }

      if (filters.progress_state) {
        query += ' AND t.progress_state = ?';
        params.push(filters.progress_state);
      }

      // Add ordering
      query += ' ORDER BY t.created_at DESC';

      const tasks = await db.query(query, params);
      return tasks;
    } catch (error) {
      throw new Error('Error fetching tasks: ' + error.message);
    }
  }

  // Get task by ID with updates
  static async getById(id) {
    try {
      // Get task details
      const task = await db.get(`
        SELECT
          t.id,
          t.title,
          t.description,
          t.status,
          t.priority,
          t.assigned_to,
          t.created_by,
          t.created_at,
          t.updated_at,
          t.due_date,
          t.progress_state,
          creator.name as creator_name,
          assigned.name as assigned_name
        FROM tasks t
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users assigned ON t.assigned_to = assigned.id
        WHERE t.id = ?
      `, [id]);

      if (!task) {
        throw new Error('Task not found');
      }

      // Get task updates
      const updates = await db.query(`
        SELECT
          u.id,
          u.comment,
          u.progress_state,
          u.timestamp,
          user.name as user_name
        FROM updates u
        JOIN users user ON u.user_id = user.id
        WHERE u.task_id = ?
        ORDER BY u.timestamp DESC
      `, [id]);

      return { ...task, updates };
    } catch (error) {
      throw new Error('Error fetching task: ' + error.message);
    }
  }

  // Create new task
  static async create(taskData, createdBy) {
    try {
      const { title, description, priority, assigned_to, due_date } = taskData;

      // Validate input
      if (!title) {
        throw new Error('Title is required');
      }

      if (!['baja', 'media', 'alta'].includes(priority || 'media')) {
        throw new Error('Priority must be baja, media, or alta');
      }

      // Validate assigned user if provided
      if (assigned_to) {
        const assignedUser = await db.get('SELECT id FROM users WHERE id = ?', [assigned_to]);
        if (!assignedUser) {
          throw new Error('Assigned user not found');
        }
      }

      const result = await db.run(`
        INSERT INTO tasks (title, description, priority, assigned_to, created_by, due_date)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        title,
        description || '',
        priority || 'media',
        assigned_to || null,
        createdBy,
        due_date || null
      ]);

      return await this.getById(result.id);
    } catch (error) {
      throw new Error('Error creating task: ' + error.message);
    }
  }

  // Update task
  static async update(id, taskData, updatedBy) {
    try {
      const { title, description, status, priority, assigned_to, due_date, progress_state } = taskData;

      // Check if task exists
      const existingTask = await db.get('SELECT id FROM tasks WHERE id = ?', [id]);
      if (!existingTask) {
        throw new Error('Task not found');
      }

      // Validate status if provided
      if (status && !['activo', 'inactivo', 'finalizado'].includes(status)) {
        throw new Error('Status must be activo, inactivo, or finalizado');
      }

      // Validate priority if provided
      if (priority && !['baja', 'media', 'alta'].includes(priority)) {
        throw new Error('Priority must be baja, media, or alta');
      }

      // Validate progress_state if provided
      if (progress_state && !['inicializado', 'en proceso', 'finalizado'].includes(progress_state)) {
        throw new Error('Progress state must be inicializado, en proceso, or finalizado');
      }

      // Validate assigned user if provided
      if (assigned_to) {
        const assignedUser = await db.get('SELECT id FROM users WHERE id = ?', [assigned_to]);
        if (!assignedUser) {
          throw new Error('Assigned user not found');
        }
      }

      // Build update query dynamically
      const updates = [];
      const params = [];

      if (title !== undefined) {
        updates.push('title = ?');
        params.push(title);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }
      if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
      }
      if (priority !== undefined) {
        updates.push('priority = ?');
        params.push(priority);
      }
      if (assigned_to !== undefined) {
        updates.push('assigned_to = ?');
        params.push(assigned_to);
      }
      if (due_date !== undefined) {
        updates.push('due_date = ?');
        params.push(due_date);
      }
      if (progress_state !== undefined) {
        updates.push('progress_state = ?');
        params.push(progress_state);
      }

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(id);

      await db.run(`
        UPDATE tasks
        SET ${updates.join(', ')}
        WHERE id = ?
      `, params);

      return await this.getById(id);
    } catch (error) {
      throw new Error('Error updating task: ' + error.message);
    }
  }

  // Delete task
  static async delete(id) {
    try {
      const result = await db.run('DELETE FROM tasks WHERE id = ?', [id]);

      if (result.changes === 0) {
        throw new Error('Task not found');
      }

      return true;
    } catch (error) {
      throw new Error('Error deleting task: ' + error.message);
    }
  }

  // Add progress update
  static async addUpdate(taskId, updateData, userId) {
    try {
      const { comment, progress_state } = updateData;

      // Validate input
      if (!comment && !progress_state) {
        throw new Error('Comment or progress state is required');
      }

      if (progress_state && !['inicializado', 'en proceso', 'finalizado'].includes(progress_state)) {
        throw new Error('Progress state must be inicializado, en proceso, or finalizado');
      }

      // Check if task exists
      const task = await db.get('SELECT id FROM tasks WHERE id = ?', [taskId]);
      if (!task) {
        throw new Error('Task not found');
      }

      const result = await db.run(`
        INSERT INTO updates (task_id, user_id, comment, progress_state)
        VALUES (?, ?, ?, ?)
      `, [
        taskId,
        userId,
        comment || '',
        progress_state || 'inicializado'
      ]);

      // Update task's progress_state if provided
      if (progress_state) {
        await db.run(`
          UPDATE tasks
          SET progress_state = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [progress_state, taskId]);
      }

      return await db.get(`
        SELECT
          u.id,
          u.comment,
          u.progress_state,
          u.timestamp,
          user.name as user_name
        FROM updates u
        JOIN users user ON u.user_id = user.id
        WHERE u.id = ?
      `, [result.id]);
    } catch (error) {
      throw new Error('Error adding update: ' + error.message);
    }
  }

  // Get task statistics
  static async getStats() {
    try {
      const stats = await db.get(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'activo' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'inactivo' THEN 1 END) as inactive,
          COUNT(CASE WHEN status = 'finalizado' THEN 1 END) as completed,
          COUNT(CASE WHEN assigned_to IS NULL THEN 1 END) as unassigned
        FROM tasks
      `);

      return stats;
    } catch (error) {
      throw new Error('Error fetching task statistics: ' + error.message);
    }
  }
}

module.exports = Task;