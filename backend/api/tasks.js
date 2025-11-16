const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Get all tasks with optional filtering
router.get('/', requireAuth, async (req, res) => {
  try {
    const filters = {};

    if (req.query.status) {
      filters.status = req.query.status;
    }

    if (req.query.assigned_to) {
      filters.assigned_to = req.query.assigned_to === 'null' ? null : parseInt(req.query.assigned_to);
    }

    if (req.query.priority) {
      filters.priority = req.query.priority;
    }

    const tasks = await Task.getAll(filters);
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task by ID with updates
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.getById(id);
    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  }
});

// Create new task
router.post('/', requireAuth, async (req, res) => {
  try {
    const taskData = req.body;

    // Add created_by from session
    const task = await Task.create(taskData, req.session.userId);

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('task:created', task);

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update task
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const taskData = req.body;

    const task = await Task.update(id, taskData, req.session.userId);

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('task:updated', task);

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Delete task (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await Task.delete(id);

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('task:deleted', { id });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete task' });
    }
  }
});

// Add progress update to task
router.post('/:id/updates', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const update = await Task.addUpdate(id, updateData, req.session.userId);

    // Get updated task with all updates
    const updatedTask = await Task.getById(id);

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('task:update_added', {
      taskId: id,
      update,
      task: updatedTask
    });

    res.status(201).json(update);
  } catch (error) {
    console.error('Add update error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Get task statistics
router.get('/stats/overview', requireAuth, async (req, res) => {
  try {
    const stats = await Task.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
});

// Assign task to user
router.post('/:id/assign', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;

    // Validate assigned user if provided
    if (assigned_to) {
      const User = require('../models/User');
      const assignedUser = await User.getById(assigned_to);
      if (!assignedUser) {
        return res.status(400).json({ error: 'Assigned user not found' });
      }
    }

    const task = await Task.update(id, { assigned_to }, req.session.userId);

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('task:assigned', {
      taskId: id,
      assignedTo: assigned_to,
      assignedByName: req.session.userName,
      task
    });

    res.json(task);
  } catch (error) {
    console.error('Assign task error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Update task status
router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['activo', 'inactivo', 'finalizado'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const task = await Task.update(id, { status }, req.session.userId);

    // Emit real-time update
    const io = req.app.get('io');
    io.emit('task:status_changed', {
      taskId: id,
      status,
      changedByName: req.session.userName,
      task
    });

    res.json(task);
  } catch (error) {
    console.error('Update status error:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

module.exports = router;