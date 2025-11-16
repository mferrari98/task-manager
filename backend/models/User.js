const db = require('./database');

class User {
  // Get all users
  static async getAll() {
    try {
      const users = await db.query(`
        SELECT id, name, role, created_at
        FROM users
        ORDER BY created_at DESC
      `);
      return users;
    } catch (error) {
      throw new Error('Error fetching users: ' + error.message);
    }
  }

  // Get user by ID
  static async getById(id) {
    try {
      const user = await db.get(
        'SELECT id, name, role, created_at FROM users WHERE id = ?',
        [id]
      );
      return user;
    } catch (error) {
      throw new Error('Error fetching user: ' + error.message);
    }
  }

  // Get user by name
  static async getByName(name) {
    try {
      const user = await db.get(
        'SELECT id, name, role, created_at FROM users WHERE name = ?',
        [name]
      );
      return user;
    } catch (error) {
      throw new Error('Error fetching user by name: ' + error.message);
    }
  }

  // Create new user
  static async create(userData) {
    try {
      const { name, role } = userData;

      // Validate input
      if (!name || !role) {
        throw new Error('Name and role are required');
      }

      if (!['admin', 'trabajador'].includes(role)) {
        throw new Error('Role must be either admin or trabajador');
      }

      // Check if user already exists
      const existingUser = await this.getByName(name);
      if (existingUser) {
        throw new Error('User with this name already exists');
      }

      const result = await db.run(
        'INSERT INTO users (name, role) VALUES (?, ?)',
        [name, role]
      );

      return await this.getById(result.id);
    } catch (error) {
      throw new Error('Error creating user: ' + error.message);
    }
  }

  // Update user
  static async update(id, userData) {
    try {
      const { name, role } = userData;

      // Validate input
      if (!name || !role) {
        throw new Error('Name and role are required');
      }

      if (!['admin', 'trabajador'].includes(role)) {
        throw new Error('Role must be either admin or trabajador');
      }

      // Check if name is already taken by another user
      const existingUser = await db.get(
        'SELECT id FROM users WHERE name = ? AND id != ?',
        [name, id]
      );
      if (existingUser) {
        throw new Error('User with this name already exists');
      }

      await db.run(
        'UPDATE users SET name = ?, role = ? WHERE id = ?',
        [name, role, id]
      );

      return await this.getById(id);
    } catch (error) {
      throw new Error('Error updating user: ' + error.message);
    }
  }

  // Delete user
  static async delete(id) {
    try {
      // Check if user has assigned tasks
      const assignedTasks = await db.get(
        'SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ?',
        [id]
      );

      if (assignedTasks.count > 0) {
        throw new Error('Cannot delete user with assigned tasks. Reassign tasks first.');
      }

      const result = await db.run('DELETE FROM users WHERE id = ?', [id]);

      if (result.changes === 0) {
        throw new Error('User not found');
      }

      return true;
    } catch (error) {
      throw new Error('Error deleting user: ' + error.message);
    }
  }

  // Get users by role
  static async getByRole(role) {
    try {
      const users = await db.query(
        'SELECT id, name, role, created_at FROM users WHERE role = ? ORDER BY name',
        [role]
      );
      return users;
    } catch (error) {
      throw new Error('Error fetching users by role: ' + error.message);
    }
  }

  // Check if user is admin
  static async isAdmin(userId) {
    try {
      const user = await db.get(
        'SELECT role FROM users WHERE id = ?',
        [userId]
      );
      return user && user.role === 'admin';
    } catch (error) {
      throw new Error('Error checking user role: ' + error.message);
    }
  }
}

module.exports = User;